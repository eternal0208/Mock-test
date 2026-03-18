const { db } = require('../config/firebaseAdmin');
const NodeCache = require('node-cache');
const testCache = new NodeCache({ stdTTL: 600 }); // Cache tests for 10 minutes

// @desc    Create a new test
// @route   POST /api/tests
// @access  Admin
exports.createTest = async (req, res) => {
    try {
        const { title, duration, totalMarks, subject, category, difficulty, instructions, startTime, endTime, questions, isVisible, maxAttempts, resultVisibility, resultDeclarationTime } = req.body;

        // Validation: Ensure all MCQ/MSQ/Integer questions have answers
        if (questions && Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const qType = q.type || 'mcq';
                if (qType === 'mcq' && !q.correctOption) {
                    return res.status(400).json({ message: `Question ${i + 1} (MCQ) is missing a correct option.` });
                }
                if (qType === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) {
                    return res.status(400).json({ message: `Question ${i + 1} (MSQ) is missing correct options.` });
                }
                if (qType === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === '')) {
                    return res.status(400).json({ message: `Question ${i + 1} (Integer) is missing an answer.` });
                }
            }
        }

        const adminLevel = req.user?.adminLevel || 3;
        const forceDraft = adminLevel === 3 || req.body.isDraft;
        const finalStatus = forceDraft ? 'draft' : 'published';
        const finalVisible = forceDraft ? false : (isVisible !== undefined ? isVisible : true);

        const newTest = {
            title,
            duration_minutes: Number(duration),
            total_marks: Number(totalMarks),
            subject,
            category: category || 'JEE Main',
            difficulty,
            isVisible: finalVisible,
            status: finalStatus,
            instructions,
            startTime: startTime || null,
            endTime: endTime || null,
            maxAttempts: maxAttempts !== undefined ? Number(maxAttempts) : null,
            expiryDate: req.body.expiryDate || null,
            // Result visibility settings
            resultVisibility: resultVisibility || 'immediate', // 'immediate' | 'scheduled' | 'afterTestEnds'
            resultDeclarationTime: resultDeclarationTime || null, // ISO date string for scheduled mode
            questions: (questions || []).map((q, i) => ({
                ...q,
                _id: q._id || `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`,
                // Ensure solution fields are preserved
                solution: q.solution || '',
                solutionImage: q.solutionImage || ''
            })),
            questionCount: (questions || []).length,
            answerCount: (questions || []).filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length,
            createdBy: req.user.uid || req.user._id || 'admin',
            createdByName: req.body.createdByName || req.user.name || req.user.displayName || (req.user.email ? req.user.email.split('@')[0] : 'Admin'),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('tests').add(newTest);

        // Link to Series if seriesId provided
        if (req.body.seriesId) {
            try {
                const seriesRef = db.collection('testSeries').doc(req.body.seriesId);
                const seriesDoc = await seriesRef.get();
                if (seriesDoc.exists) {
                    const currentTestIds = seriesDoc.data().testIds || [];
                    await seriesRef.update({
                        testIds: [...currentTestIds, docRef.id]
                    });
                }
            } catch (err) {
                console.error("Failed to link test to series:", err);
                // Non-critical error, continue
            }
        }

        res.status(201).json({ _id: docRef.id, ...newTest });
    } catch (error) {
        console.error("Create Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add questions to a test (Legacy/Optional)
// @route   POST /api/tests/:id/questions
// @access  Admin
exports.addQuestions = async (req, res) => {
    try {
        const { questions } = req.body;
        const testRef = db.collection('tests').doc(req.params.id);
        const doc = await testRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Test not found' });

        const currentQuestions = doc.data().questions || [];
        const updatedQuestions = [...currentQuestions, ...questions];

        await testRef.update({ questions: updatedQuestions });

        res.status(200).json({ _id: doc.id, ...doc.data(), questions: updatedQuestions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a Test
// @route   DELETE /api/tests/:id
// @access  Admin
exports.deleteTest = async (req, res) => {
    try {
        await db.collection('tests').doc(req.params.id).delete();
        res.status(200).json({ message: 'Test deleted successfully' });
    } catch (error) {
        console.error("Delete Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Student/Admin
exports.getAllTests = async (req, res) => {
    try {
        console.log("🔍 [API] GET /api/tests called");
        const snapshot = await db.collection('tests').select('title', 'duration_minutes', 'total_marks', 'subject', 'category', 'difficulty', 'isVisible', 'status', 'createdBy', 'createdByName', 'startTime', 'endTime', 'expiryDate', 'maxAttempts', 'questionCount', 'answerCount', 'questions').get();
        console.log(`🔍 [DEBUG] Tests found in DB: ${snapshot.size}`);

        const tests = [];
        const isAdmin = req.user && req.user.role === 'admin';
        let userCategory = req.user?.category;

        // Fallback: Fetch user category from DB if not in token and not admin
        if (!isAdmin && !userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam || uData.interest;
                }
            } catch (e) {
                console.error("Error fetching user category fallback:", e);
            }
        }

        console.log("🔍 [DEBUG] Requester:", {
            uid: req.user?.uid,
            role: req.user?.role,
            category: userCategory
        });

        snapshot.forEach(doc => {
            const data = doc.data();
            const testId = doc.id;

            // ADMIN: Show all tests regardless of category or visibility
            if (isAdmin) {
                tests.push({
                    _id: doc.id,
                    title: data.title,
                    duration_minutes: data.duration_minutes,
                    total_marks: data.total_marks,
                    subject: data.subject,
                    category: data.category || 'JEE Main',
                    difficulty: data.difficulty,
                    isVisible: data.isVisible !== undefined ? data.isVisible : true,
                    status: data.status || (data.isVisible === false ? 'hidden' : 'active'),
                    createdBy: data.createdBy,
                    createdByName: data.createdByName,
                    updatedBy: data.updatedBy,
                    updatedByName: data.updatedByName,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    expiryDate: data.expiryDate || null,
                    maxAttempts: data.maxAttempts,
                    questionCount: data.questionCount || (data.questions || []).length,
                    answerCount: (data.answerCount > 0) ? data.answerCount : (data.questions || []).filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length,
                    questions: data.questions || []
                });
                return;
            }

            // STUDENT: Apply strict filters
            const testCategory = data.category;

            // Debug check for specific tests if needed
            // console.log(`🔍 Checking Test ${data.title}: UserCat=${userCategory}, TestCat=${testCategory}, Visible=${data.isVisible}`);

            // Filter 1: Category must match (Case Insensitive)
            if (!userCategory || !testCategory || userCategory.toLowerCase() !== testCategory.toLowerCase()) {
                // console.log(`❌ Skipping Test ${data.title}: Category Mismatch (${userCategory} vs ${testCategory})`);
                return;
            }

            // Filter 2: Only show visible tests and NOT drafts
            if (data.isVisible === false || data.status === 'draft') {
                // console.log(`❌ Skipping Test ${data.title}: Not Visible or Draft`);
                return;
            }

            tests.push({
                _id: doc.id,
                title: data.title,
                duration_minutes: data.duration_minutes,
                total_marks: data.total_marks,
                subject: data.subject,
                category: data.category || 'JEE Main',
                difficulty: data.difficulty,
                isVisible: data.isVisible !== undefined ? data.isVisible : true,
                startTime: data.startTime,
                endTime: data.endTime,
                expiryDate: data.expiryDate || null,
                maxAttempts: data.maxAttempts,
                questionCount: data.questionCount || 0,
                answerCount: data.answerCount || 0
            });
        });

        console.log(`✅ [DEBUG] Returning ${tests.length} tests to client`);
        res.status(200).json(tests);
    } catch (error) {
        console.error("❌ [API ERROR] getAllTests:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single test (Start Exam)
// @route   GET /api/tests/:id
// @access  Student/Admin
exports.getTestById = async (req, res) => {
    try {
        const doc = await db.collection('tests').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const data = doc.data();

        // Security: Check permissions
        const isAdmin = req.user && req.user.role === 'admin';

        // ADMIN: Can access any test — include all question data (they created it)
        if (isAdmin) {
            const questionsWithIds = (data.questions || []).map((q, i) => ({
                ...q,
                _id: q._id || `q_${doc.id}_${i}`, // Use deterministic IDs instead of random ones
            }));
            return res.status(200).json({ _id: doc.id, ...data, questions: questionsWithIds });
        }

        // STUDENT: Check category and visibility
        let userCategory = req.user?.category;
        if (!userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam;
                }
            } catch (e) { }
        }

        const testCategory = data.category;

        // Filter 1: Category must match
        // STRICT CHECK: Matches exactly.
        const categoryMatch = userCategory && userCategory === testCategory;

        // Filter 2: Test must be visible
        const isVisible = data.isVisible !== false && data.status !== 'draft';

        // AUTH CHECK:
        // A user can access the test if:
        // 1. (Standard) Category Matches AND Test is Visible (Start Exam flow)
        // 2. (Result Review) User has already ATTEMPTED the test (Result exists) -> Bypass restrictions so they can view solutions.

        let hasAttempted = false;
        const userId = req.user?.uid;

        if (userId) {
            try {
                const resultCheck = await db.collection('results')
                    .where('testId', '==', req.params.id)
                    .where('userId', '==', userId)
                    .limit(1)
                    .get();
                hasAttempted = !resultCheck.empty;
            } catch (e) { console.error("Error checking attempt", e); }
        }

        if (!hasAttempted) {
            if (!categoryMatch) return res.status(403).json({ message: 'Access Denied: Category mismatch.' });
            if (!isVisible) return res.status(403).json({ message: 'Test is not currently available.' });

            // FRAUD PROTECTION: Check if test belongs to a PAID series
            // If yes, user MUST have a valid purchase record
            if (userId) {
                try {
                    // Find any series containing this test
                    const seriesSnapshot = await db.collection('testSeries')
                        .where('testIds', 'array-contains', req.params.id)
                        .limit(1)
                        .get();

                    if (!seriesSnapshot.empty) {
                        const seriesDoc = seriesSnapshot.docs[0];
                        const seriesData = seriesDoc.data();

                        // If series is PAID, verify purchase
                        if (seriesData.price > 0 && seriesData.isPaid !== false) {
                            const purchaseRef = db.collection('purchases').doc(userId).collection('tests').doc(seriesDoc.id);
                            const purchaseDoc = await purchaseRef.get();

                            if (!purchaseDoc.exists || purchaseDoc.data().status !== 'enrolled') {
                                console.warn(`🚫 [FRAUD] User ${userId} tried to access paid test ${req.params.id} without purchase`);
                                return res.status(403).json({
                                    message: 'Purchase required. This test belongs to a paid series.',
                                    requiresPurchase: true,
                                    seriesId: seriesDoc.id
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error checking paid series access:', e);
                    // Don't block on error — fail open for check, but log it
                }
            }
        }

        // If User has attempted, we SHOW correctOption.
        // If User has NOT attempted, we HIDE correctOption (Security).

        let questionsToSend = data.questions || [];

        if (!hasAttempted) {
            // Sanitize for new attempts
            questionsToSend = questionsToSend.map((q, i) => ({
                ...q,
                _id: q._id || `q_${doc.id}_${i}`,
                correctOption: undefined,
                correctOptions: undefined,
                integerAnswer: undefined
            }));
        } else {
            // Ensure IDs even for review
            questionsToSend = questionsToSend.map((q, i) => ({
                ...q,
                _id: q._id || `q_${doc.id}_${i}`
            }));
        }

        res.status(200).json({ _id: doc.id, ...data, questions: questionsToSend });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Test & Calculate Score
// @route   POST /api/tests/:id/submit
// @access  Student
exports.submitTest = async (req, res) => {
    try {
        const { userId, answers } = req.body;
        console.log(`🚀 [SUBMIT] Received submission for test ${req.params.id} from user ${userId}`);

        if (!Array.isArray(answers)) {
            console.error("❌ [SUBMIT] answers is not an array:", answers);
            return res.status(400).json({ message: "Invalid submission data format." });
        }

        // helper to normalize any answer/value for comparison
        const normalize = (v) => {
            if (v === null || v === undefined) return '';
            return String(v).trim();
        };

        const testId = req.params.id;
        let test = testCache.get(testId);

        if (!test) {
            console.log(`[SUBMIT] Cache miss for test ${testId}. Fetching from Firestore.`);
            const testRef = db.collection('tests').doc(testId);
            const testDoc = await testRef.get();

            if (!testDoc.exists) {
                return res.status(404).json({ message: 'Test not found' });
            }
            test = testDoc.data();
            testCache.set(testId, test);
        } else {
            console.log(`[SUBMIT] Cache hit for test ${testId}. Skipping Firestore read.`);
        }

        // Helper to ensure questions have IDs
        const ensureIds = (qs) => qs.map((q, i) => ({
            ...q,
            _id: q._id || `q_${req.params.id}_${i}` // Deterministic Fallback
        }));

        const dbQuestions = ensureIds(test.questions || []);
        const answerCount = dbQuestions.filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length;

        if (answerCount === 0) {
            console.error(`❌ [SUBMIT] Test ${req.params.id} has NO answers marked in DB.`);
            return res.status(400).json({
                message: "This test has no answer keys marked yet. Results cannot be calculated.",
                isBroken: true
            });
        }

        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        const attemptData = [];

        // Map for lookup. Note: In Firestore, questions are just array objects, they might not have unique _id unless we added them.
        // My previous code expected q._id. Admin creating tests uses the UI which currently doesn't add _id.
        // BUT invalidating the reliance on q._id is risky.
        // Let's assume we match by Index if ID is missing or match by Text?
        // Index is safer for specific test instance.
        // The submitted answers usually contain questionId.
        // If questionId is missing in `questions` array objects, we have a problem.
        // Fix: My `getTestById` above adds a dummy ID if missing, but that's random per request! 
        // THIS IS ARCTITECTURALLY FLAWED if IDs aren't persistent.
        // FIX: The seed script and Admin UI should add IDs. 
        // HOWEVER, to be robust: let's match by index provided we tell frontend the index.
        // Frontend uses `q._id`.

        // TEMPORARY FIX: If test questions don't have IDs, we can't reliably score.
        // I will assume for now we use index as ID if real ID is missing, but frontend sends ID.
        // Let's rely on the fact that I will re-seed data properly or update the Admin tool to add IDs.
        // For now, let's map by text comparison if ID fails? No, questions might be duplicate text.

        // Simpler: The frontend received `questions` with generated IDs (random) in `getTestById` above!
        // So the frontend sends back those random IDs. 
        // Iterate through the `questions` array and try to find equality?
        // Since `getTestById` generates random IDs on the fly, we CANNOT verify them on submit unless we stored them.
        // CRITICAL FIX: `getTestById` must NOT return random IDs if they aren't persisted.

        // I must update `createTest` to add IDs to questions.
        // AND for `submitTest`, I must iterate carefully.

        // Let's update `createTest` logic in this replacement as well (handled above? No, I didn't add IDs in createTest).
        // Actually, let's handle `submitTest` by assuming the `questions` array order matches. 
        // But the frontend sends `questionId`.

        // STRATEGY: 
        // 1. In `createTest` (Admin), assume data comes with IDs or we generate them.
        // 2. In `submitTest`, if we can't find by ID, we fail?
        // Let's look at `users` answers.

        // Let's create a map based on question text (risky but works for likely unique questions)
        // OR better: Just loop and check `questionId`.
        // If `questionId` corresponds to nothing, we skip?
        // Wait, Mongoose subdocs had `_id` automatically. Firestore object arrays do NOT.
        // Implementation:
        // When checking answers, we iterate `test.questions`.
        // If `test.questions` elements have no `_id`, we can't match `answer.questionId`.

        // PROPOSED FIX for Legacy Mongoose compatibility:
        // We will assume `answer.questionId` might be an index if it's a number? No, mongo IDs are strings.

        // Let's just Loop through users answers and match against test.questions.
        // Ideally, test.questions have stable IDs.
        // I will update the Seed script to add IDs.

        const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

        // Loop through answers using the map
        answers.forEach(ans => {
            let question = questionMap.get(ans.questionId);

            // Fallback: If ID mismatch (legacy), try index matching if ID looks like index-based
            if (!question && ans.questionId && ans.questionId.startsWith(`q_${req.params.id}_`)) {
                const idx = parseInt(ans.questionId.split('_').pop());
                if (!isNaN(idx)) question = dbQuestions[idx];
            }

            if (!question) {
                console.warn(`[SUBMIT DEBUG] NO QUESTION FOUND for id="${ans.questionId}". Map keys: ${[...questionMap.keys()].slice(0, 3).join(', ')}`);
            }

            if (question) {
                let isCorrect = false;

                // SCORING LOGIC BASED ON TYPE
                if (question.type === 'msq') {
                    const userAns = Array.isArray(ans.selectedOption) ? ans.selectedOption : [ans.selectedOption];
                    const correctAnsLetters = question.correctOptions || [];

                    // Resolve MSQ Letters (e.g., ['A', 'B']) to Text/Placeholders
                    const correctAnsResolved = correctAnsLetters.map(letter => {
                        const l = normalize(letter).toUpperCase();
                        const ltIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                        if (ltIdx[l] !== undefined && question.options) {
                            return normalize(question.options[ltIdx[l]]) || `Option ${ltIdx[l] + 1}`;
                        }
                        return normalize(letter);
                    });

                    // normalize each entry and sort for comparison
                    const sortedUser = [...userAns].map(normalize).sort();
                    const sortedCorrect = [...correctAnsResolved].map(normalize).sort();

                    if (sortedUser.length === sortedCorrect.length &&
                        sortedUser.every((val, index) => val === sortedCorrect[index])) {
                        isCorrect = true;
                    }
                } else if (question.type === 'integer') {
                    if (normalize(ans.selectedOption) === normalize(question.integerAnswer)) {
                        isCorrect = true;
                    }
                } else {
                    // MCQ: handle both legacy letter format ('A','B','C','D') and current text format
                    let correctOptResolved = question.correctOption;
                    const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    const letter = normalize(question.correctOption).toUpperCase();
                    if (letterToIdx[letter] !== undefined && question.options) {
                        const idx = letterToIdx[letter];
                        correctOptResolved = normalize(question.options[idx]) || `Option ${idx + 1}`;
                    }
                    isCorrect = normalize(correctOptResolved) === normalize(ans.selectedOption);
                }

                if (isCorrect) {
                    score += Number(question.marks || 4); // Added fallback to prevent NaN
                    correctCount++;
                } else if (ans.selectedOption && (Array.isArray(ans.selectedOption) ? ans.selectedOption.length > 0 : true)) {
                    score -= Number(question.negativeMarks || 1); // Added fallback to prevent NaN
                    wrongCount++;
                }

                // Resolve correctAnswer for storage
                let correctAnswerForStorage = null;
                let correctOptionsForStorage = null;
                if (question.type === 'msq') {
                    correctOptionsForStorage = question.correctOptions || [];
                } else if (question.type === 'integer') {
                    correctAnswerForStorage = question.integerAnswer;
                } else {
                    // MCQ: resolve letter format and normalize for storage
                    let resolved = question.correctOption;
                    const ltIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    const lt = normalize(question.correctOption).toUpperCase();
                    if (ltIdx[lt] !== undefined && question.options) {
                        resolved = normalize(question.options[ltIdx[lt]]) || `Option ${ltIdx[lt] + 1}`;
                    }
                    correctAnswerForStorage = normalize(resolved);
                }

                // Final Resolve for MSQ Correct Options Storage
                if (question.type === 'msq') {
                    const ltIdxMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    correctOptionsForStorage = (question.correctOptions || []).map(opt => {
                        const l = normalize(opt).toUpperCase();
                        if (ltIdxMap[l] !== undefined && question.options) {
                            return normalize(question.options[ltIdxMap[l]]) || `Option ${ltIdxMap[l] + 1}`;
                        }
                        return normalize(opt);
                    });
                }

                attemptData.push({
                    questionId: ans.questionId,
                    questionText: question.text || null,
                    subject: question.subject || null,
                    topic: question.topic || null,
                    selectedOption: ans.selectedOption !== undefined ? ans.selectedOption : null,
                    isCorrect,
                    correctAnswer: correctAnswerForStorage !== undefined ? correctAnswerForStorage : null,
                    correctOptions: correctOptionsForStorage !== undefined ? correctOptionsForStorage : null,
                    integerAnswer: question.type === 'integer' ? (question.integerAnswer ?? null) : null,
                    questionType: question.type || 'mcq',
                    marks: question.marks ?? null,
                    negativeMarks: question.negativeMarks ?? null,
                    markedAt: new Date().toISOString()
                });
            }
        });

        const totalQuestions = dbQuestions.length;
        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        const newResult = {
            userId,
            testId: req.params.id, // Store as String for querying
            testDetails: { // Store metadata separately
                _id: req.params.id,
                title: test.title,
                subject: test.subject,
                total_marks: test.total_marks
            },
            score,
            accuracy,
            totalQuestions,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            attempt_data: attemptData,
            time_taken: req.body.timeTaken || 0,
            feedback: req.body.feedback || null,
            submittedAt: new Date().toISOString()
        };

        const resRef = await db.collection('results').add(newResult);

        res.status(200).json({ _id: resRef.id, ...newResult });

    } catch (error) {
        console.error("Submit Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a test
// @route   PUT /api/tests/:id
// @access  Admin
exports.updateTest = async (req, res) => {
    try {
        const { title, duration, totalMarks, subject, category, difficulty, instructions, startTime, endTime, questions, isVisible, maxAttempts, resultVisibility, resultDeclarationTime, expiryDate } = req.body;

        const adminLevel = req.user?.adminLevel || 3;
        const forceDraft = adminLevel === 3 || req.body.isDraft;

        const updateData = {
            title,
            duration_minutes: duration !== undefined ? Number(duration) : undefined,
            total_marks: totalMarks !== undefined ? Number(totalMarks) : undefined,
            subject,
            category,
            difficulty,
            instructions,
            startTime,
            endTime,
            isVisible: forceDraft ? false : isVisible,
            status: forceDraft ? 'draft' : req.body.status,
            maxAttempts: maxAttempts !== undefined ? Number(maxAttempts) : undefined,
            expiryDate,
            resultVisibility,
            resultDeclarationTime,
            updatedBy: req.user.uid || req.user._id || 'admin',
            updatedByName: req.body.updatedByName || req.user.name || req.user.displayName || (req.user.email ? req.user.email.split('@')[0] : 'Admin'),
            updatedAt: new Date().toISOString()
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // Safeguard: Fetch existing test to preserve answers if missing in payload
        const testRef = db.collection('tests').doc(req.params.id);
        const doc = await testRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }
        const existingData = doc.data();

        if (questions) {
            updateData.questions = questions.map((q, i) => {
                const existingQ = (existingData.questions || []).find(oldQ => oldQ._id === q._id);

                const mergedQ = {
                    ...q,
                    _id: q._id || `q_${req.params.id}_${i}_${Math.random().toString(36).substring(2, 9)}`,
                    type: q.type || existingQ?.type || 'mcq',
                    solution: q.solution || existingQ?.solution || '',
                    solutionImage: q.solutionImage || existingQ?.solutionImage || ''
                };

                if (mergedQ.type === 'mcq' && !q.correctOption && existingQ?.correctOption) {
                    mergedQ.correctOption = existingQ.correctOption;
                }
                if (mergedQ.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0) && existingQ?.correctOptions) {
                    mergedQ.correctOptions = existingQ.correctOptions;
                }
                if (mergedQ.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === '') && existingQ?.integerAnswer !== undefined) {
                    mergedQ.integerAnswer = existingQ.integerAnswer;
                }

                // We no longer reject missing answers here to allow partial saving/drafts.
                // The frontend handles warnings.

                return mergedQ;
            });
            updateData.questionCount = updateData.questions.length;
            updateData.answerCount = updateData.questions.filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length;
        }

        await testRef.update(updateData);

        res.status(200).json({ _id: req.params.id, ...updateData });
    } catch (error) {
        console.error("Update Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Analytics for a Test (Rank List, Stats)
// @route   GET /api/tests/:id/analytics
// @access  Authenticated
exports.getTestAnalytics = async (req, res) => {
    try {
        const testId = req.params.id;

        // 1. Get all results for this test
        const resultsSnapshot = await db.collection('results').where('testId', '==', testId).get();
        if (resultsSnapshot.empty) {
            return res.status(200).json({
                avgScore: 0,
                totalAttempts: 0,
                rankList: [],
                feedbacks: []
            });
        }

        let totalScore = 0;
        let results = [];
        let feedbacks = [];

        // 2. Process results
        for (const doc of resultsSnapshot.docs) {
            const data = doc.data();
            totalScore += Number(data.score) || 0;

            if (data.feedback) {
                if (typeof data.feedback === 'object') {
                    feedbacks.push(data.feedback);
                } else {
                    feedbacks.push({ rating: 0, comment: data.feedback });
                }
            }

            results.push({
                userId: data.userId,
                score: Number(data.score),
                accuracy: data.accuracy || 0,
                correctAnswers: data.correctAnswers || 0,
                wrongAnswers: data.wrongAnswers || 0,
                timeTaken: data.time_taken,
                submittedAt: data.submittedAt
            });
        }

        // 3. Calculate Stats
        const totalAttempts = results.length;
        const avgScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

        // 4. Rank Generation (Sort by Score DESC, then Time ASC)
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeTaken - b.timeTaken;
        });

        // 5. Enhance with Names
        const enrichedRankList = await Promise.all(results.map(async (r, idx) => {
            let name = 'Student';
            // Only fetch names if Admin or if it's the current user (optimization)
            // Actually, we need names for the Admin view.
            if (req.user?.role === 'admin' || r.userId === req.user?.uid) {
                try {
                    const userDoc = await db.collection('users').doc(r.userId).get();
                    if (userDoc.exists) name = userDoc.data().name;
                } catch (e) { }
            }

            return {
                rank: idx + 1,
                name,
                score: r.score,
                accuracy: r.accuracy,
                correctAnswers: r.correctAnswers,
                wrongAnswers: r.wrongAnswers,
                timeTaken: r.timeTaken,
                submittedAt: r.submittedAt,
                userId: r.userId
            };
        }));

        // SECURITY FILTER:
        // If Admin: Send full list.
        // If Student: Send ONLY their entry (Privacy).
        let finalRankList = enrichedRankList;
        if (req.user?.role !== 'admin') {
            finalRankList = enrichedRankList.filter(r => r.userId === req.user?.uid);
        }

        res.status(200).json({
            testId,
            totalAttempts,
            avgScore,
            rankList: finalRankList,
            feedbacks: req.user?.role === 'admin' ? feedbacks : [] // Hide feedback from others too
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Feedback for a Test (Post-Submission)
// @route   POST /api/tests/:id/feedback
// @access  Student
exports.submitFeedback = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const testId = req.params.id;
        const userId = req.user.uid;

        if (!rating) {
            return res.status(400).json({ message: 'Rating is required' });
        }

        // Find the most recent result for this test and user
        const resultsRef = db.collection('results');
        const snapshot = await resultsRef
            .where('testId', '==', testId)
            .where('userId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No attempt found for this test to provide feedback on.' });
        }

        const resultDoc = snapshot.docs[0];
        await resultDoc.ref.update({
            feedback: {
                rating: Number(rating),
                comment: comment || ''
            }
        });

        res.status(200).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error("Submit Feedback Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Active Test Series (Public)
// @route   GET /api/tests/series
exports.getAllSeries = async (req, res) => {
    try {
        const snapshot = await db.collection('testSeries').where('isActive', '==', true).get();

        const series = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            series.push({ id: doc.id, ...data });
        });

        res.status(200).json(series);
    } catch (error) {
        console.error("Fetch Series Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Single Series by ID with its Tests
// @route   GET /api/tests/series/:id
// @access  Authenticated
exports.getSeriesById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('testSeries').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Series not found' });
        }

        const seriesData = { id: doc.id, ...doc.data() };

        // Fetch associated tests if testIds exist
        let tests = [];
        if (seriesData.testIds && seriesData.testIds.length > 0) {
            // Firestore 'in' queries support max 30 items per batch
            const batchSize = 30;
            for (let i = 0; i < seriesData.testIds.length; i += batchSize) {
                const batch = seriesData.testIds.slice(i, i + batchSize);
                const testsSnapshot = await db.collection('tests')
                    .where('__name__', 'in', batch)
                    .select('title', 'duration_minutes', 'total_marks', 'subject', 'category', 'difficulty', 'questionCount', 'isVisible', 'status')
                    .get();

                testsSnapshot.forEach(tDoc => {
                    const tData = tDoc.data();

                    // Filter drafts & hidden tests for non-admins
                    if (req.user?.role !== 'admin') {
                        if (tData.isVisible === false || tData.status === 'draft') return;
                    }

                    tests.push({
                        _id: tDoc.id,
                        title: tData.title,
                        duration_minutes: tData.duration_minutes,
                        total_marks: tData.total_marks,
                        subject: tData.subject,
                        category: tData.category || 'General',
                        difficulty: tData.difficulty,
                        questionCount: tData.questionCount || 0,
                        status: tData.status || 'published',
                        isVisible: tData.isVisible !== undefined ? tData.isVisible : true
                    });
                });
            }
        }

        res.status(200).json({ series: seriesData, tests });
    } catch (error) {
        console.error("Fetch Series By ID Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle Test Visibility
// @route   PUT /api/tests/:id/visibility
// @access  Admin
exports.toggleVisibility = async (req, res) => {
    try {
        const { isVisible } = req.body;
        await db.collection('tests').doc(req.params.id).update({ isVisible });
        res.status(200).json({ message: 'Visibility updated', isVisible });
    } catch (error) {
        console.error("Toggle Visibility Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Generate Shuffled Mocks from existing mocks (Dynamic)
// @route   POST /api/tests/generate-shuffled
// @access  Admin
exports.generateShuffledMocks = async (req, res) => {
    try {
        const { testIds, blueprint, mockCount } = req.body;
        // blueprint format: { "Physics|mcq": 10, "Physics|integer": 5 }
        if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of testIds' });
        }
        if (!blueprint || typeof blueprint !== 'object') {
            return res.status(400).json({ message: 'Blueprint object is required.' });
        }
        const requestedMocks = Number(mockCount) || 1;

        const tests = [];
        for (const id of testIds) {
            const doc = await db.collection('tests').doc(id).get();
            if (doc.exists) {
                tests.push({ id: doc.id, ...doc.data() });
            }
        }

        if (tests.length === 0) {
            return res.status(404).json({ message: 'None of the provided tests were found' });
        }

        // Verify same category (e.g. JEE Main)
        const firstCategory = tests[0].category;
        for (const t of tests) {
            if (t.category !== firstCategory) {
                return res.status(400).json({ message: 'All selected tests must belong to the same category.' });
            }
        }

        // Pool all questions by subject|type
        const pool = {};
        tests.forEach(t => {
            (t.questions || []).forEach(q => {
                const key = `${q.subject || 'General'}|${q.type || 'mcq'}`;
                if (!pool[key]) pool[key] = [];
                // Assign new unique IDs globally to prevent React render issues and result conflicts
                pool[key].push({ ...q, _id: `q_shf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` });
            });
        });

        // Validation against the Blueprint
        for (const [key, reqCount] of Object.entries(blueprint)) {
            const available = pool[key] ? pool[key].length : 0;
            if (available < reqCount) {
                return res.status(400).json({ message: `Insufficient questions for ${key}. Required: ${reqCount}, Available: ${available}` });
            }
        }

        const maxAllowed = 50; 
        if (requestedMocks > maxAllowed) {
            return res.status(400).json({ message: `Cannot generate more than ${maxAllowed} mocks at once to prevent server overload.` });
        }

        // Shuffle helper
        const shuffleArray = (arr) => {
            const cpy = [...arr]; // Create a copy so we don't mutate the original pool immediately before all test iteration
            for (let i = cpy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cpy[i], cpy[j]] = [cpy[j], cpy[i]];
            }
            return cpy;
        };

        const newMocks = [];
        const baseTest = tests[0];

        // Generate the specified number of mocks
        for (let i = 0; i < requestedMocks; i++) {
            const generatedQuestions = [];
            
            // For EACH new mock, take a FRESH shuffled copy of all pools.
            // This allows the same question to appear across different mocks,
            // but NEVER twice within the SAME mock.
            // And because we randomize, the selection is different every time.
            for (const [key, reqCount] of Object.entries(blueprint)) {
                if (reqCount > 0 && pool[key]) {
                    const shuffledBucket = shuffleArray(pool[key]);
                    const picked = shuffledBucket.slice(0, reqCount);
                    generatedQuestions.push(...picked);
                }
            }

            // Shuffle the final list to mix subjects if desired, or leave grouped.
            // Grouped is better for structural integrity.

            // Calculate total marks based on picked questions
            const totalMarks = generatedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 4), 0);

            const newMock = {
                title: `[Gen] ${baseTest.title.substring(0, 20)}... - Mock ${i + 1}`,
                duration_minutes: baseTest.duration_minutes,
                total_marks: totalMarks || baseTest.total_marks,
                subject: 'Combined Subjects',
                category: baseTest.category,
                difficulty: baseTest.difficulty,
                isVisible: false, // Draft
                status: 'draft',
                instructions: baseTest.instructions,
                startTime: null,
                endTime: null,
                maxAttempts: baseTest.maxAttempts,
                questions: generatedQuestions,
                questionCount: generatedQuestions.length,
                answerCount: generatedQuestions.filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length,
                createdBy: req.user?.uid || req.user?._id || 'admin',
                createdByName: req.user?.name || req.user?.displayName || 'Admin',
                createdAt: new Date().toISOString()
            };

            const docRef = await db.collection('tests').add(newMock);
            newMocks.push({ id: docRef.id, title: newMock.title });
        }

        res.status(200).json({ 
            message: `Successfully generated ${requestedMocks} new mocks.`, 
            generatedCount: requestedMocks,
            mocks: newMocks
        });

    } catch (error) {
        console.error("Generate Shuffled Mocks Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
