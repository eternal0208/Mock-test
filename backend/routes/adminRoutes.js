const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const TestSeries = require('../models/TestSeries');
const { getPercentileData, updatePercentileData } = require('../models/PercentileData');
const { protect } = require('../middleware/authMiddleware');

const multer = require('multer');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PDFDocument } = require('pdf-lib');

const os = require('os');
const execPromise = util.promisify(exec);
// ✅ VERCEL FIX: Use system temp directory for uploads to bypass read-only filesystem
const upload = multer({ dest: os.tmpdir() });

// Allow OPTIONS preflight on Gemini parser before auth protect
router.options('/tests/parse-pdf-gemini', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    return res.sendStatus(204);
});

// Protect all admin routes
router.use(protect);

// --- Admin Team Leaderboard ---
// GET /api/admin/team-stats - Get all admins and their stats
router.get('/team-stats', async (req, res) => {
    try {
        // 1. Fetch all admins
        const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();
        const admins = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch all tests to count uploads and reviews
        const testsSnapshot = await db.collection('tests').get();
        const tests = testsSnapshot.docs.map(doc => doc.data());

        // 3. Calculate stats for each admin
        const teamStats = admins.map(admin => {
            const uid = admin.id;

            // Uploads: test createdBy matches this admin
            const uploads = tests.filter(t => t.createdBy === uid).length;

            // Reviews: test updatedBy matches this admin, and they are not the creator 
            // OR they published it (we can just count any update where updatedBy === uid)
            const reviews = tests.filter(t => t.updatedBy === uid && t.createdBy !== uid).length;

            // Simple scoring: 10 pts per upload, 5 pts per review
            const score = (uploads * 10) + (reviews * 5);

            let badge = 'Rookie';
            if (score >= 100) badge = 'Master Admin 👑';
            else if (score >= 50) badge = 'Expert Reviewer 🌟';
            else if (score >= 20) badge = 'Active Contributor ⭐';

            return {
                id: uid,
                name: admin.name || admin.displayName || (admin.email ? admin.email.split('@')[0] : 'Unknown'),
                email: admin.email,
                level: Number(admin.adminLevel) || 1, // Ensure number type for strict checks
                photoURL: admin.photoURL || null,
                uploads,
                reviews,
                score,
                badge
            };
        });

        // 4. Separate Level 1 admins from the rest
        const level1Admins = teamStats.filter(admin => admin.level === 1);
        const regularAdmins = teamStats.filter(admin => admin.level !== 1);

        // 5. Sort regular admins by score descending to get ranks
        regularAdmins.sort((a, b) => b.score - a.score);

        // Assign numeric rank only to regular admins
        regularAdmins.forEach((admin, index) => {
            admin.rank = index + 1;
        });

        res.json({
            superAdmins: level1Admins,
            leaderboard: regularAdmins
        });
    } catch (error) {
        console.error("Team Stats Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Test Series Management ---

// POST /api/admin/series - Create New Series
router.post('/series', async (req, res) => {
    try {
        const data = req.body;
        const newSeries = new TestSeries(data);
        const docRef = await db.collection('testSeries').add(newSeries.toFirestore());
        res.status(201).json({ id: docRef.id, ...newSeries.toFirestore() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/series - Get All Series
router.get('/series', async (req, res) => {
    try {
        let query = db.collection('testSeries');
        
        // Scope to institute level for institute_admin
        if (req.user.role === 'institute_admin') {
            if (!req.user.instituteCode) {
                return res.status(403).json({ error: 'Institute admin missing institute code.' });
            }
            query = query.where('instituteCode', '==', req.user.instituteCode);
        }

        const snapshot = await query.get();
        const series = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(series);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/series/:id - Update Series
router.put('/series/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Basic update
        await db.collection('testSeries').doc(id).update({
            ...data,
            updatedAt: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/series/:id - Delete (or Deactivate)
router.delete('/series/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('testSeries').doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/tests/:id - Delete Test
router.delete('/tests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('tests').doc(id).delete();
        res.json({ success: true, message: 'Test deleted successfully' });
    } catch (error) {
        console.error('Delete Test Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Native Markdown to JSON parser ---
const parseMockTestMarkdown = (markdown) => {
    // Split by question numbers "1. ", "Q1.", "2)"
    const sections = markdown.split(/(?:^|\n)(?:Q\d+\.|\d+\.|\d+\)|\*\*Q\d+\.\*\*|\*\*?\d+\.\*\*?)/i).filter(s => s.trim().length > 10);
    const questions = [];

    for (let sec of sections) {
        // Find options: A), (A), A., a)
        const optRegex = /(?:^|\n)\s*(?:\([a-d]\)|[a-d]\)|\([A-D]\)|[A-D]\)|[A-D]\.|\*\*[A-D]\.\*\*)\s+/g;
        const parts = sec.split(optRegex);
        
        let text = parts[0] ? parts[0].trim() : "Parsed Text Here...";
        let options = ['', '', '', ''];
        
        // Extract up to 4 options
        if (parts.length > 1) {
             for(let i=1; i<=4 && i<parts.length; i++) {
                 options[i-1] = parts[i].trim();
             }
        }

        // Add to questions
        if (text.length > 5) {
             questions.push({
                 text: text,
                 type: "mcq", // Default to MCQ
                 options: options,
                 correctOption: "A", 
                 correctOptions: [],
                 integerAnswer: "",
                 solution: ""
             });
        }
    }

    // Fallback if regex split fails
    if (questions.length === 0 && markdown.trim().length > 0) {
        questions.push({
             text: markdown.trim(),
             type: "mcq",
             options: ['', '', '', ''],
             correctOption: "A",
             correctOptions: [],
             integerAnswer: "",
             solution: ""
        });
    }

    return questions;
};


// --- Marker PDF Parsing ---
// POST /api/admin/tests/parse-pdf-marker
router.post('/tests/parse-pdf-marker', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    let mainPdfDoc;
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    const cleanup = (dirs = [], files = []) => {
        dirs.forEach(d => { try { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); } catch(e) {} });
        files.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e) {} });
    };

    try {
        console.log(`[Marker Stream] Starting incremental parsing for: ${req.file.originalname}`);
        
        const existingPdfBytes = fs.readFileSync(pdfPath);
        mainPdfDoc = await PDFDocument.load(existingPdfBytes);
        const pageCount = mainPdfDoc.getPageCount();

        // Send initial metadata
        res.write(JSON.stringify({ status: 'started', totalPages: pageCount }) + "\n");

        for (let i = 0; i < pageCount; i++) {
            console.log(`[Marker Stream] Processing page ${i + 1}/${pageCount}...`);
            
            const tempPageDir = path.join(__dirname, '../uploads', `page_in_${Date.now()}_${i}`);
            const tempOutputDir = path.join(__dirname, '../uploads', `page_out_${Date.now()}_${i}`);
            fs.mkdirSync(tempPageDir, { recursive: true });

            // Create a new PDF for the single page
            const subPdfDoc = await PDFDocument.create();
            const [copiedPage] = await subPdfDoc.copyPages(mainPdfDoc, [i]);
            subPdfDoc.addPage(copiedPage);
            const pdfBytes = await subPdfDoc.save();
            
            const pagePdfPath = path.join(tempPageDir, `page_${i + 1}.pdf`);
            fs.writeFileSync(pagePdfPath, pdfBytes);

            try {
                // Run marker on just this page
                await execPromise(
                    `marker "${tempPageDir}" --output_dir "${tempOutputDir}" --disable_multiprocessing`,
                    { timeout: 120000 } // 2 mins per page
                );

                // Find .md file
                let mdContent = "";
                const findAndReadMd = (dir) => {
                    if (!fs.existsSync(dir)) return;
                    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                        const full = path.join(dir, entry.name);
                        if (entry.isDirectory()) findAndReadMd(full);
                        else if (entry.name.endsWith('.md')) { mdContent = fs.readFileSync(full, 'utf-8'); return; }
                    }
                };
                findAndReadMd(tempOutputDir);

                if (mdContent) {
                    const questions = parseMockTestMarkdown(mdContent);
                    // Stream this page's results
                    res.write(JSON.stringify({ 
                        status: 'progress', 
                        page: i + 1, 
                        questions: questions 
                    }) + "\n");
                } else {
                    res.write(JSON.stringify({ status: 'warning', message: `No content extracted from page ${i+1}` }) + "\n");
                }

            } catch (pageErr) {
                console.error(`Error processing page ${i+1}:`, pageErr.message);
                res.write(JSON.stringify({ status: 'error', page: i + 1, message: pageErr.message }) + "\n");
            } finally {
                cleanup([tempPageDir, tempOutputDir]);
            }
        }

        res.write(JSON.stringify({ status: 'complete' }) + "\n");
        res.end();

    } catch (error) {
        console.error('Marker Streaming Error:', error.message);
        res.write(JSON.stringify({ status: 'fatal_error', error: error.message }) + "\n");
        res.end();
    } finally {
        cleanup([], [pdfPath]);
    }
});


// --- Gemini AI PDF Parsing (Page-by-Page for Accuracy) ---
// Ensure preflight works without auth token. NOTE: caller sends Authorization header only on POST.
router.options('/tests/parse-pdf-gemini', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    return res.sendStatus(204);
});

// POST /api/admin/tests/parse-pdf-gemini
router.post('/tests/parse-pdf-gemini', upload.single('pdf'), async (req, res) => {
    const { base64Image, isSelection } = req.body;
    
    if (!req.file && !base64Image) {
        return res.status(400).json({ error: 'No PDF file or Image selection provided' });
    }

    const pdfPath = req.file ? req.file.path : null;

    // Set streaming NDJSON headers for compatibility with client parser
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // ✅ THE GOD SWITCH: Disables Vercel/Nginx buffering
    
    // Explicit CORS for streaming (redundant but safe)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const sendEvent = (data) => {
        try {
            res.write(`${JSON.stringify(data)}\n`);
        } catch(e) {}
    };

    const cleanup = () => {
        try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch(e) {}
    };

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const { PDFDocument } = require('pdf-lib');
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const masterPrompt = `You are an expert exam question extraction AI.
Extract EVERY question from this image/PDF page.

OUTPUT FORMAT:
Output each question as a SINGLE LINE JSON object (NDJSON).

TEXT STYLE:
- Use NATURAL HUMAN TEXT for all words and sentences.
- Use LaTeX ($...$) ONLY for mathematical symbols, values, units, and equations.
- Example: "A block of mass $m=2\\text{ kg}$ is placed on a $30^{\\circ}$ inclined plane."
- NOT: "$\\text{A block of mass } m=2\\text{ kg} ...$" (Don't wrap everything in LaTeX).

JSON Schema:
{
  "qNumber": <number>,
  "type": "mcq" | "msq" | "integer",
  "subject": "Physics" | "Chemistry" | "Mathematics" | "Biology" | "General",
  "section": "<section name>",
  "marks": 4,
  "negativeMarks": 1,
  "text": "<natural text with LaTeX $math$ symbols>",
  "hasQuestionImage": <true if diagram/figure present>,
  "options": ["<A text>", "<B text>", "<C text>", "<D text>"],
  "hasOptionImages": [false, false, false, false],
  "correctOption": "A/B/C/D",
  "correctOptions": ["A","C"],
  "integerAnswer": "42",
  "solution": "<solution with LaTeX symbols>",
  "hasSolutionImage": false,
  "topic": ""
}

CRITICAL: 
1. LaTeX usage: $x^2$, $\\vec{F}$, $\\sin\\theta$, $\\frac{a}{b}$, $10\\text{ m/s}$.
2. If this is just a fragment of a question, still extract it - the admin will merge it later.
3. Extract any "Solution", "Hint", "Explanation", or "Answer" section present for the question entirely into the "solution" field.`;

        let totalQuestionsCount = 0;
        let totalErrorCount = 0;

        const processContent = async (base64Data, mimeType, message) => {
            sendEvent({ status: 'info', message });
            
            try {
                const result = await model.generateContent([
                    { inlineData: { mimeType, data: base64Data } },
                    { text: masterPrompt }
                ]);

                const responseText = result.response.text();
                
                // ✅ APEX BULLETPROOF PARSER: Char-by-char scanner for multi-line JSON
                let braceCount = 0;
                let currentBlock = "";
                let inString = false;
                let escaped = false;

                for (let i = 0; i < responseText.length; i++) {
                    const char = responseText[i];
                    
                    if (char === '\\' && !escaped) {
                        escaped = true;
                        if (braceCount > 0) currentBlock += char;
                        continue;
                    }

                    if (char === '"' && !escaped) {
                        inString = !inString;
                    }

                    if (!inString) {
                        if (char === '{') {
                            if (braceCount === 0) currentBlock = "";
                            braceCount++;
                        }
                    }

                    if (braceCount > 0) currentBlock += char;

                    if (!inString) {
                        if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                // Finalize the block
                                try {
                                    const q = JSON.parse(currentBlock);
                                    if (q.text) {
                                        totalQuestionsCount++;
                                        sendEvent({ 
                                            status: 'question', 
                                            question: { ...q, qNumber: totalQuestionsCount }, 
                                            index: totalQuestionsCount 
                                        });
                                    }
                                } catch (e) {
                                    console.error('[Parser Warning] Snippet failed JSON.parse');
                                }
                                currentBlock = "";
                            }
                        }
                    }
                    
                    escaped = false;
                }
            } catch (err) {
                console.error('Gemini Extraction Page/Image Error:', err.message);
                throw err;
            }
        };

        // ✅ APEX SURGICAL DISPATCH: Handle incoming Base64 images (Selection or Page Capture)
        if (base64Image) {
            const data = base64Image.split(',')[1] || base64Image;
            await processContent(data, 'image/png', isSelection === 'true' ? 'Scanning Selection...' : 'Scanning Page Capture...');
            
            sendEvent({ 
                status: 'complete', 
                totalQuestions: totalQuestionsCount, 
                message: `Extraction complete! Found ${totalQuestionsCount} items.` 
            });
            return res.end();
        } 

        // CASE 2: Full PDF Upload (Only used if no surgical image provided)
        if (pdfPath) {
            const fullPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(fullPdfBytes);
            const pageCount = pdfDoc.getPageCount();

            sendEvent({ 
                status: 'started', 
                message: `PDF Loaded: ${pageCount} pages. Starting extraction...`,
                total_pages: pageCount
            });

            for (let i = 0; i < pageCount; i++) {
                sendEvent({ status: 'page', current_page: i + 1, total_pages: pageCount });

                const subPdfDoc = await PDFDocument.create();
                const [copiedPage] = await subPdfDoc.copyPages(pdfDoc, [i]);
                subPdfDoc.addPage(copiedPage);
                const subPdfBytes = await subPdfDoc.save();
                const base64Page = Buffer.from(subPdfBytes).toString('base64');

                await processContent(base64Page, 'application/pdf', `Extracting from Page ${i + 1}...`);
            }

            sendEvent({ 
                status: 'complete', 
                totalQuestions: totalQuestionsCount, 
                message: `Extraction complete! Found ${totalQuestionsCount} items.` 
            });
        }
        res.end();

    } catch (error) {
        console.error('[Gemini Workbench Backend Error]', error.message);
        sendEvent({ status: 'error', message: error.message });
        res.end();
    } finally {
        cleanup();
    }
});

// POST /api/admin/tests/parse-image-gemini
router.post('/tests/parse-image-gemini', async (req, res) => {
    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (data) => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch(e) {}
    };

    try {
        const { image } = req.body;
        if (!image) {
            sendEvent({ status: 'error', message: 'No image provided' });
            return res.end();
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // image format: data:image/png;base64,...
        const base64Data = image.split(',')[1];
        if (!base64Data) throw new Error("Invalid image format");

        sendEvent({ status: 'started', message: 'Extracting questions from selection...' });

        const masterPrompt = `You are an expert exam question extraction AI.
Extract EVERY question from this image snippet. 

OUTPUT FORMAT:
Output each question as a SINGLE LINE JSON object (NDJSON).

TEXT STYLE:
- Use NATURAL HUMAN TEXT for all words and sentences.
- Use LaTeX ($...$) ONLY for mathematical symbols, values, units, and equations.
- Example: "A block of mass $m=2\\text{ kg}$ is placed on a $30^{\\circ}$ inclined plane."
- NOT: "$\\text{A block of mass } m=2\\text{ kg} ...$" (Don't wrap everything in LaTeX).

JSON Schema:
{
  "qNumber": <number>,
  "type": "mcq" | "msq" | "integer",
  "subject": "Physics" | "Chemistry" | "Mathematics" | "Biology" | "General",
  "section": "<section name>",
  "marks": 4,
  "negativeMarks": 1,
  "text": "<natural text with LaTeX $math$ symbols>",
  "hasQuestionImage": <true if diagram/figure present>,
  "options": ["<A text>", "<B text>", "<C text>", "<D text>"],
  "hasOptionImages": [false, false, false, false],
  "correctOption": "A/B/C/D",
  "correctOptions": ["A","C"],
  "integerAnswer": "42",
  "solution": "<solution with LaTeX symbols>",
  "hasSolutionImage": false,
  "topic": ""
}

CRITICAL: 
1. LaTeX usage: $x^2$, $\\vec{F}$, $\\sin\\theta$, $\\frac{a}{b}$, $10\\text{ m/s}$.
2. If this is just a fragment of a question, still extract it - the admin will merge it later.
3. Extract any "Solution", "Hint", "Explanation", or "Answer" section present for the question entirely into the "solution" field.`;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: base64Data
                }
            },
            { text: masterPrompt }
        ]);

        const responseText = result.response.text();
        
        // ✅ APEX BULLETPROOF PARSER: Char-by-char scanner for multi-line JSON
        let braceCount = 0;
        let currentBlock = "";
        let inString = false;
        let escaped = false;
        let questionCount = 0;

        for (let i = 0; i < responseText.length; i++) {
            const char = responseText[i];
            
            if (char === '\\' && !escaped) {
                escaped = true;
                if (braceCount > 0) currentBlock += char;
                continue;
            }

            if (char === '"' && !escaped) {
                inString = !inString;
            }

            if (!inString) {
                if (char === '{') {
                    if (braceCount === 0) currentBlock = "";
                    braceCount++;
                }
            }

            if (braceCount > 0) currentBlock += char;

            if (!inString) {
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        try {
                            const q = JSON.parse(currentBlock);
                            if (q.text) {
                                questionCount++;
                                sendEvent({ 
                                    status: 'question', 
                                    question: { ...q, qNumber: questionCount }, 
                                    index: questionCount 
                                });
                            }
                        } catch (e) {
                            console.error('[Parser Warning] Selection snippet failed JSON.parse');
                        }
                        currentBlock = "";
                    }
                }
            }
            
            escaped = false;
        }

        sendEvent({ 
            status: 'complete', 
            totalQuestions: questionCount, 
            message: `Successfully extracted ${questionCount} questions!` 
        });
        res.end();
    } catch (error) {
        console.error('[Gemini Image Error]', error.message);
        sendEvent({ status: 'error', message: error.message });
        res.end();
    }
});


// --- Syllabus Management ---

// GET /api/admin/syllabus - Get Syllabus Links
router.get('/syllabus', async (req, res) => {
    try {
        const doc = await db.collection('settings').doc('syllabus').get();
        if (!doc.exists) {
            return res.json({});
        }
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/syllabus - Update Syllabus Links
router.post('/syllabus', async (req, res) => {
    try {
        const data = req.body; // { 'JEE Main': 'url', ... }
        await db.collection('settings').doc('syllabus').set(data, { merge: true });
        res.json({ success: true, message: 'Syllabus links updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Percentile Config Management ---

// GET /api/admin/percentile-data
router.get('/percentile-data', async (req, res) => {
    try {
        const data = await getPercentileData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/percentile-data
router.post('/percentile-data', async (req, res) => {
    try {
        const updatedData = req.body;
        await updatePercentileData(updatedData);
        res.json({ success: true, message: 'Percentile data updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/students - List All Students
router.get('/students', async (req, res) => {
    try {
        let query = db.collection('users').orderBy('createdAt', 'desc');

        if (req.user.role === 'institute_admin') {
            if (!req.user.instituteCode) {
                return res.json([]); // Prevents accidentally returning all users
            }
            // Cannot use orderBy with equality filter on different field unless we have a composite index. 
            // In Firebase, equality and range filter can be combined but might need an index.
            // A safer approach without demanding an index immediately:
            query = db.collection('users').where('instituteCode', '==', req.user.instituteCode);
        }

        const snapshot = await query.get(); 
        let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Manual sort if we dropped orderBy
        if (req.user.role === 'institute_admin') {
             students.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/students/:id/role - Update User Role
router.put('/students/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body; // 'admin' or 'student'

        if (!['admin', 'student'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const callerAdminLevel = req.user.adminLevel || (req.user.role === 'admin' ? 1 : 0);
        if (callerAdminLevel !== 1) {
            return res.status(403).json({ error: 'Only Level 1 Super Admins can change user roles' });
        }

        await db.collection('users').doc(id).update({
            role,
            instituteCode: req.body.instituteCode || '', // Specifically for assigning institute_admin
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/students/:id/adminLevel - Update Admin Level (1, 2, or 3)
router.put('/students/:id/adminLevel', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminLevel } = req.body;

        if (![1, 2, 3].includes(adminLevel)) {
            return res.status(400).json({ error: 'Invalid admin level' });
        }

        const callerAdminLevel = req.user.adminLevel || (req.user.role === 'admin' ? 1 : 0);
        if (callerAdminLevel !== 1) {
            return res.status(403).json({ error: 'Only Level 1 Super Admins can change admin levels' });
        }

        await db.collection('users').doc(id).update({
            adminLevel,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `User admin level updated to ${adminLevel}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/students/:id/status - Toggle User Status (Block/Unblock)
router.put('/students/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'blocked'

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use active or blocked.' });
        }

        await db.collection('users').doc(id).update({
            status,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `User status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/students/:id - Delete User Permanently
router.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Delete from Firebase Authentication
        try {
            const { auth } = require('../config/firebaseAdmin');
            await auth.deleteUser(id);
            console.log(`✅ Deleted user from Firebase Auth: ${id}`);
        } catch (authError) {
            console.error(`⚠️ Failed to delete from Auth (might not exist): ${authError.message}`);
            // Continue to delete from Firestore even if Auth fails (e.g. user already deleted from Auth manually)
        }

        // 2. Delete from Firestore
        await db.collection('users').doc(id).delete();

        // Optional: Delete related data like results? 
        // For now, we keep results for analytics integrity or delete them if strict cleanup is needed.
        // Keeping results is safer for "Total Attempts" stats.

        res.json({ success: true, message: 'User deleted permanently' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/student/:id/performance - Specific Student Performance
router.get('/student/:id/performance', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch Results for this userID
        const resultsSnapshot = await db.collection('results').where('userId', '==', id).get();
        const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate basic stats
        const totalTests = results.length;
        const avgScore = totalTests > 0 ? results.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalTests : 0;

        res.json({
            studentId: id,
            totalTests,
            avgScore,
            results // Detailed history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/revenue - Calculate Total Revenue with Order Details
router.get('/revenue', async (req, res) => {
    try {
        const snapshot = await db.collection('orders').where('status', '==', 'paid').get();
        const rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt in JS to avoid needing a Firestore composite index
        rawOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const totalRevenue = rawOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const revenueBySeries = {};

        // Build enriched orders with user name and series title
        const orders = [];
        for (const order of rawOrders) {
            let userName = 'Unknown';
            let itemName = order.testTitle || 'Unknown Item';

            // Fetch user name
            try {
                if (order.userId) {
                    const userDoc = await db.collection('users').doc(order.userId).get();
                    if (userDoc.exists) userName = userDoc.data().name || userDoc.data().email || 'Unknown';
                }
            } catch (e) { }

            // Always fetch latest series title from DB (not stale order data)
            try {
                if (order.seriesId) {
                    const seriesDoc = await db.collection('testSeries').doc(order.seriesId).get();
                    if (seriesDoc.exists) itemName = seriesDoc.data().title || itemName;
                }
            } catch (e) { }

            // Revenue by series
            if (order.seriesId) {
                if (!revenueBySeries[order.seriesId]) {
                    revenueBySeries[order.seriesId] = { title: itemName, total: 0, count: 0 };
                }
                revenueBySeries[order.seriesId].total += order.amount || 0;
                revenueBySeries[order.seriesId].count += 1;
            }

            orders.push({
                id: order.id,
                userId: order.userId,
                seriesId: order.seriesId,
                userName,
                itemName,
                amount: order.amount,
                currency: order.currency || 'INR',
                status: order.status,
                paymentId: order.paymentId,
                razorpayOrderId: order.razorpayOrderId,
                createdAt: order.createdAt,
                couponCode: order.couponCode || null,
                discountAmount: order.discountAmount || 0
            });
        }

        res.json({
            totalRevenue,
            totalOrders: rawOrders.length,
            revenueBySeries,
            orders
        });
    } catch (error) {
        console.error('Revenue Fetch Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/verify-revenue-password - Verify the admin dashboard revenue tab access password
router.post('/verify-revenue-password', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const doc = await db.collection('settings').doc('admin_config').get();

        if (!doc.exists) {
            // If the document doesn't exist, it means the password hasn't been configured yet.
            // For security, default to denying access until the DB is set up securely.
            console.warn('Revenue password not configured in database yet: settings/admin_config');
            return res.status(401).json({ error: 'Revenue access not configured. Please contact site Administrator.' });
        }

        const data = doc.data();
        const storedPassword = data.revenuePassword;

        if (!storedPassword) {
            return res.status(401).json({ error: 'Revenue access not configured. Please contact site Administrator.' });
        }

        if (password === storedPassword) {
            res.json({ success: true, message: 'Access granted' });
        } else {
            res.status(401).json({ error: 'Incorrect password' });
        }
    } catch (error) {
        console.error('Verify Revenue Password Error:', error);
        res.status(500).json({ error: error.message });
    }
});



// POST /api/admin/rescore-all-results
// Re-scores all existing results using the fixed correctOption comparison logic
router.post('/rescore-all-results', async (req, res) => {
    try {
        // normalize helper used throughout
        const normalize = (v) => {
            if (v === null || v === undefined) return '';
            return String(v).trim();
        };

        // Helper: resolve letter-format correctOption to actual text (normalized)
        const resolveCorrectOption = (question) => {
            if (!question.correctOption) return null;
            const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const letter = normalize(question.correctOption).toUpperCase();
            if (letterToIdx[letter] !== undefined && question.options) {
                const idx = letterToIdx[letter];
                return normalize(normalize(question.options[idx]) || `Option ${idx + 1}`);
            }
            return normalize(question.correctOption);
        };

        const resultsSnap = await db.collection('results').get();
        let updated = 0, skipped = 0, errors = 0;

        for (const resultDoc of resultsSnap.docs) {
            try {
                const result = resultDoc.data();
                let testId = result.testId;
                if (testId && typeof testId === 'object') testId = testId._id;

                if (!testId) { skipped++; continue; }

                // Fetch original test
                const testDoc = await db.collection('tests').doc(testId).get();
                if (!testDoc.exists) { skipped++; continue; }

                const testData = testDoc.data();
                const questions = testData.questions || [];

                // Build question map
                const questionMap = new Map(
                    questions.map((q, i) => [q._id || `q_${testId}_${i}`, q])
                );

                // Re-score each attempt
                let score = 0, correctCount = 0, wrongCount = 0;
                const newAttemptData = (result.attempt_data || []).map((att, idx) => {
                    // STRATEGY 1: Match by ID
                    let question = questionMap.get(att.questionId);

                    // STRATEGY 2: Match by Text if ID fails
                    if (!question && att.questionText) {
                        const normText = normalize(att.questionText);
                        question = questions.find(q => normalize(q.text) === normText);
                    }

                    // STRATEGY 3: Match by Index as last resort
                    if (!question) {
                        question = questions[idx];
                    }

                    if (!question) return att; // Keep as-is if still not found

                    let isCorrect = false;
                    if (question.type === 'msq') {
                        const userAns = Array.isArray(att.selectedOption) ? att.selectedOption : [att.selectedOption];
                        const correctAnsLetters = question.correctOptions || [];

                        // Resolve MSQ Letters to Text/Placeholders
                        const correctAnsResolved = correctAnsLetters.map(letter => {
                            const l = normalize(letter).toUpperCase();
                            const ltIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                            if (ltIdx[l] !== undefined && question.options) {
                                return normalize(question.options[ltIdx[l]]) || `Option ${ltIdx[l] + 1}`;
                            }
                            return normalize(letter);
                        });

                        const sortedUser = [...userAns].map(normalize).sort();
                        const sortedCorrect = [...correctAnsResolved].map(normalize).sort();
                        isCorrect = sortedUser.length === sortedCorrect.length &&
                            sortedUser.every((val, i) => val === sortedCorrect[i]);
                    } else if (question.type === 'integer') {
                        isCorrect = normalize(att.selectedOption) === normalize(question.integerAnswer);
                    } else {
                        // MCQ — resolve letter format
                        const correctOptResolved = resolveCorrectOption(question);
                        isCorrect = normalize(correctOptResolved) === normalize(att.selectedOption);
                    }

                    const isAttempted = att.selectedOption !== null && att.selectedOption !== undefined && att.selectedOption !== '';

                    // Check if answer keys exist
                    const hasAnswerKey = question.type === 'msq'
                        ? (question.correctOptions && question.correctOptions.length > 0)
                        : (question.type === 'integer'
                            ? (question.integerAnswer !== undefined && question.integerAnswer !== '')
                            : (question.correctOption !== undefined && question.correctOption !== null));

                    if (isCorrect && hasAnswerKey) {
                        score += Number(question.marks || 4);
                        correctCount++;
                    } else if (isAttempted && hasAnswerKey) {
                        score -= Number(question.negativeMarks || 1);
                        wrongCount++;
                    } else if (isAttempted && !hasAnswerKey) {
                        // Log or mark as ungradable
                        console.warn(`[RESCORE] Question missing answer key for test ${testId}, question ${att.questionId}`);
                    }

                    // Resolve correctAnswer for storage
                    let correctAnswerForStorage = null;
                    let correctOptionsForStorage = null;
                    if (question.type === 'msq') {
                        const ltIdxMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                        correctOptionsForStorage = (question.correctOptions || []).map(opt => {
                            const l = normalize(opt).toUpperCase();
                            if (ltIdxMap[l] !== undefined && question.options) {
                                return normalize(question.options[ltIdxMap[l]]) || `Option ${ltIdxMap[l] + 1}`;
                            }
                            return normalize(opt);
                        });
                    } else if (question.type === 'integer') {
                        correctAnswerForStorage = question.integerAnswer;
                    } else {
                        correctAnswerForStorage = normalize(resolveCorrectOption(question));
                    }

                    return {
                        ...att,
                        isCorrect,
                        correctAnswer: correctAnswerForStorage !== undefined ? correctAnswerForStorage : null,
                        correctOptions: correctOptionsForStorage !== undefined ? correctOptionsForStorage : null,
                        integerAnswer: question.type === 'integer' ? (question.integerAnswer ?? null) : null,
                        questionType: question.type || att.questionType || 'mcq',
                        marks: question.marks ?? null,
                        negativeMarks: question.negativeMarks ?? null,
                    };
                });

                const totalQ = questions.length;
                const accuracy = totalQ > 0 ? (correctCount / totalQ) * 100 : 0;

                await db.collection('results').doc(resultDoc.id).update({
                    score,
                    correctAnswers: correctCount,
                    wrongAnswers: wrongCount,
                    accuracy: Math.round(accuracy * 100) / 100,
                    attempt_data: newAttemptData,
                    rescored_at: new Date().toISOString()
                });

                updated++;
            } catch (err) {
                console.error(`Error rescoring result ${resultDoc.id}:`, err.message);
                errors++;
            }
        }

        res.json({
            message: `Rescoring complete`,
            total: resultsSnap.size,
            updated,
            skipped,
            errors
        });
    } catch (error) {
        console.error('Rescore Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Coupon Management ---

// GET /api/admin/coupons — List all coupons
router.get('/coupons', async (req, res) => {
    try {
        const snapshot = await db.collection('coupons').orderBy('createdAt', 'desc').get();
        const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(coupons);
    } catch (error) {
        console.error('Fetch Coupons Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/coupons — Create coupon
router.post('/coupons', async (req, res) => {
    try {
        const {
            code, discountType, applicableFields,
            maxUses, maxUsesPerUser, validFrom, validUntil, isActive
        } = req.body;
        let { discountValue } = req.body; // Use let for discountValue

        if (!code || !discountType) {
            return res.status(400).json({ error: 'code and discountType are required' });
        }

        // Check uniqueness
        const existing = await db.collection('coupons').where('code', '==', code.toUpperCase()).get();
        if (!existing.empty) {
            return res.status(400).json({ error: 'A coupon with this code already exists' });
        }

        // Handle discountValue for 'free' type
        if (discountType === 'free') {
            discountValue = 0; // Ensure discountValue is 0 for 'free'
        } else {
            discountValue = Number(discountValue) || 0;
        }

        const couponData = {
            code: code.toUpperCase().trim(),
            discountType,                             // 'percent' | 'flat' | 'free'
            discountValue: discountValue,
            applicableFields: applicableFields || ['all'],
            maxUses: Number(maxUses) || 0,            // 0 = unlimited
            maxUsesPerUser: Number(maxUsesPerUser) || 1,
            usedCount: 0,
            validFrom: validFrom || null,
            validUntil: validUntil || null,
            isActive: isActive !== false,
            usages: [],
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('coupons').add(couponData);
        res.status(201).json({ id: docRef.id, ...couponData });
    } catch (error) {
        console.error('Create Coupon Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/coupons/:id — Update coupon
router.put('/coupons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        if (updates.code) updates.code = updates.code.toUpperCase().trim();
        if (updates.discountType === 'free') {
            updates.discountValue = 0; // Ensure discountValue is 0 for 'free'
        } else if (updates.discountValue !== undefined) {
            updates.discountValue = Number(updates.discountValue);
        }
        if (updates.maxUses !== undefined) updates.maxUses = Number(updates.maxUses);
        if (updates.maxUsesPerUser !== undefined) updates.maxUsesPerUser = Number(updates.maxUsesPerUser);
        await db.collection('coupons').doc(id).update(updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Update Coupon Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/coupons/:id — Delete coupon
router.delete('/coupons/:id', async (req, res) => {
    try {
        const { id } = req.params; // Destructure id from req.params
        await db.collection('coupons').doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Coupon Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Institutes Management ---
router.get('/institutes', async (req, res) => {
    try {
        const snapshot = await db.collection('institutes').orderBy('createdAt', 'desc').get();
        const institutes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(institutes);
    } catch (error) {
         res.status(500).json({ error: error.message });
    }
});

router.post('/institutes', async (req, res) => {
    try {
        const adminLevel = req.user.adminLevel || (req.user.role === 'admin' ? 1 : 0);
        if (adminLevel !== 1) return res.status(403).json({ error: 'Super Admin only' });

        const data = req.body;
        const Institute = require('../models/Institute');
        const newInstitute = new Institute({ ...data, createdBy: req.user.uid });
        const docRef = await db.collection('institutes').add(newInstitute.toFirestore());
        res.status(201).json({ id: docRef.id, ...newInstitute.toFirestore() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/institutes/:id', async (req, res) => {
    try {
        const adminLevel = req.user.adminLevel || (req.user.role === 'admin' ? 1 : 0);
        if (adminLevel !== 1) return res.status(403).json({ error: 'Super Admin only' });

        const { id } = req.params;
        await db.collection('institutes').doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
