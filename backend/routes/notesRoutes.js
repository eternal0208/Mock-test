const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { protect, authorize } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Use system temp directory for uploads (Vercel-safe)
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// Helper: get Firebase Storage bucket
const getBucket = () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    return admin.storage().bucket(`${projectId}.firebasestorage.app`);
};

// GET /api/notes/proxy — Proxy a PDF stream to bypass frontend CORS while preserving Range
router.get('/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL required');
        
        const fetchHeaders = {};
        if (req.headers.range) {
            fetchHeaders['Range'] = req.headers.range;
        }

        const response = await fetch(decodeURIComponent(url), {
            headers: fetchHeaders
        });

        res.status(response.status);
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (response.body) {
            const { Readable } = require('stream');
            Readable.fromWeb(response.body).pipe(res);
        } else {
            res.end();
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to proxy PDF' });
    }
});

// GET /api/notes/admin/sections?field=JEE Main — List all sections for a field (admin use, for bundling)
router.get('/admin/sections', protect, authorize('admin'), async (req, res) => {
    try {
        const { field } = req.query;
        let q = db.collection('notesSections');
        const snap = await (field ? q.where('field', '==', field).get() : q.get());

        const sections = await Promise.all(snap.docs.map(async doc => {
            const data = doc.data();
            // Count notes in this section
            const notesSnap = await db.collection('notes').where('sectionId', '==', doc.id).get();
            return {
                id: doc.id,
                title: data.title,
                field: data.field,
                type: data.type,
                icon: data.icon,
                parentId: data.parentId || null,
                price: data.price || 499,
                _noteCount: notesSnap.size
            };
        }));

        res.json({ sections: sections.filter(s => !s.parentId) }); // only parent sections
    } catch (error) {
        console.error('Admin Sections Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// All routes after this require authentication
router.use(protect);


// ============================================================
//  ADMIN ROUTES — Sections Management
// ============================================================

// POST /api/notes/sections — Create section or subsection
router.post('/sections', authorize('admin'), async (req, res) => {
    try {
        const { title, field, parentId, type, order, icon, description, price } = req.body;

        if (!title || !field) {
            return res.status(400).json({ error: 'Title and field are required' });
        }

        const validFields = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam', 'Others'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ error: `Invalid field. Must be one of: ${validFields.join(', ')}` });
        }

        const sectionData = {
            title: title.trim(),
            field,
            parentId: parentId || null,
            type: type || 'free', // 'free' | 'paid'
            instituteCode: req.body.instituteCode || '',
            price: type === 'paid' ? (Number(price) || 499) : 0,
            order: Number(order) || 0,
            icon: icon || '📄',
            description: (description || '').trim(),
            isActive: true,
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('notesSections').add(sectionData);
        res.status(201).json({ id: docRef.id, ...sectionData });
    } catch (error) {
        console.error('Create Section Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notes/sections — Get all sections (admin view, all fields)
router.get('/sections', authorize('admin'), async (req, res) => {
    try {
        const snapshot = await db.collection('notesSections').orderBy('order', 'asc').get();
        const sections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(sections);
    } catch (error) {
        console.error('Get Sections Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notes/sections/:id — Update section
router.put('/sections/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        if (updates.price !== undefined) updates.price = Number(updates.price) || 0;
        if (updates.order !== undefined) updates.order = Number(updates.order) || 0;
        // Don't allow overwriting createdAt/createdBy
        delete updates.createdAt;
        delete updates.createdBy;
        delete updates.id;

        await db.collection('notesSections').doc(id).update(updates);
        res.json({ success: true, message: 'Section updated' });
    } catch (error) {
        console.error('Update Section Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/notes/sections/:id — Delete section
router.delete('/sections/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if section has subsections
        const subsections = await db.collection('notesSections').where('parentId', '==', id).get();
        if (!subsections.empty) {
            return res.status(400).json({ error: 'Cannot delete section with subsections. Delete subsections first.' });
        }

        // Check if section has notes
        const notes = await db.collection('notes').where('sectionId', '==', id).get();
        if (!notes.empty) {
            return res.status(400).json({ error: `Cannot delete section with ${notes.size} notes. Delete or move notes first.` });
        }

        await db.collection('notesSections').doc(id).delete();
        res.json({ success: true, message: 'Section deleted' });
    } catch (error) {
        console.error('Delete Section Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
//  ADMIN ROUTES — Notes/PDF Management
// ============================================================

// POST /api/notes/upload-stage — Upload PDF to storage only (no Firestore save yet)
router.post('/upload-stage', authorize('admin'), upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const { sectionId, field } = req.body;

        if (!sectionId || !field) {
            return res.status(400).json({ error: 'sectionId and field are required' });
        }

        // Verify section exists
        const sectionDoc = await db.collection('notesSections').doc(sectionId).get();
        if (!sectionDoc.exists) {
            return res.status(404).json({ error: 'Section not found' });
        }

        // Upload to Firebase Storage
        const bucket = getBucket();
        const timestamp = Date.now();
        const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `notes/${field}/${sectionId}/${timestamp}_${safeFileName}`;

        await bucket.upload(filePath, {
            destination: storagePath,
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    uploadedBy: req.user.uid,
                    originalName: req.file.originalname,
                    staged: 'true' // Mark as staged (not confirmed)
                }
            }
        });

        // Make public and get URL
        const file = bucket.file(storagePath);
        await file.makePublic();
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // Return staged info — NOT saved to Firestore yet
        res.status(200).json({
            staged: true,
            storagePath,
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            suggestedTitle: req.file.originalname.replace('.pdf', '').replace(/_/g, ' ').trim(),
            sectionId,
            field,
            sectionType: sectionDoc.data().type || 'free'
        });

    } catch (error) {
        console.error('Stage Upload Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
    }
});

// POST /api/notes/confirm-upload — Confirm staged upload, save to Firestore
router.post('/confirm-upload', authorize('admin'), async (req, res) => {
    try {
        const { storagePath, fileUrl, fileName, fileSize, sectionId, field, title, type, isDownloadable, order, price } = req.body;

        if (!storagePath || !fileUrl || !sectionId || !field) {
            return res.status(400).json({ error: 'Missing required confirmation fields' });
        }

        const noteData = {
            title: (title || fileName?.replace('.pdf', '') || 'Untitled').trim(),
            sectionId,
            field,
            instituteCode: req.body.instituteCode || '',
            type: type || 'free',
            price: type === 'paid' ? (Number(price) || 99) : 0,
            fileUrl,
            storagePath,
            fileName: fileName || '',
            fileSize: fileSize || 0,
            isDownloadable: isDownloadable === 'true' || isDownloadable === true,
            isActive: true,
            order: Number(order) || 0,
            uploadedBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('notes').add(noteData);
        res.status(201).json({ id: docRef.id, ...noteData });

    } catch (error) {
        console.error('Confirm Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notes/discard-upload — Discard staged upload, delete from storage
router.post('/discard-upload', authorize('admin'), async (req, res) => {
    try {
        const { storagePath } = req.body;
        if (!storagePath) return res.status(400).json({ error: 'storagePath is required' });

        const bucket = getBucket();
        try {
            await bucket.file(storagePath).delete();
        } catch (e) {
            console.warn('Could not delete staged file:', e.message);
        }

        res.json({ success: true, message: 'Staged file discarded' });
    } catch (error) {
        console.error('Discard Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notes/upload — Legacy route (kept for compatibility) — Upload PDF all-at-once
router.post('/upload', authorize('admin'), upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const { title, sectionId, field, type, isDownloadable, order } = req.body;

        if (!sectionId || !field) {
            return res.status(400).json({ error: 'sectionId and field are required' });
        }

        const sectionDoc = await db.collection('notesSections').doc(sectionId).get();
        if (!sectionDoc.exists) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const bucket = getBucket();
        const timestamp = Date.now();
        const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `notes/${field}/${sectionId}/${timestamp}_${safeFileName}`;

        await bucket.upload(filePath, {
            destination: storagePath,
            metadata: { contentType: 'application/pdf' }
        });

        const file = bucket.file(storagePath);
        await file.makePublic();
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        const noteData = {
            title: (title || req.file.originalname.replace('.pdf', '')).trim(),
            sectionId,
            field,
            instituteCode: req.body.instituteCode || '',
            type: type || sectionDoc.data().type || 'free',
            fileUrl,
            storagePath,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            isDownloadable: isDownloadable === 'true' || isDownloadable === true,
            isActive: true,
            order: Number(order) || 0,
            uploadedBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('notes').add(noteData);
        res.status(201).json({ id: docRef.id, ...noteData });

    } catch (error) {
        console.error('Upload Note Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
    }
});


// GET /api/notes/admin/all — Get all notes (admin view)
router.get('/admin/all', authorize('admin'), async (req, res) => {
    try {
        const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(notes);
    } catch (error) {
        console.error('Get All Notes Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notes/:id — Update note metadata
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        if (updates.price !== undefined) updates.price = Number(updates.price) || 0;
        delete updates.createdAt;
        delete updates.uploadedBy;
        delete updates.id;
        delete updates.fileUrl;
        delete updates.storagePath;

        // Convert isDownloadable string to boolean if needed
        if (updates.isDownloadable !== undefined) {
            updates.isDownloadable = updates.isDownloadable === 'true' || updates.isDownloadable === true;
        }

        await db.collection('notes').doc(id).update(updates);
        res.json({ success: true, message: 'Note updated' });
    } catch (error) {
        console.error('Update Note Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/notes/:id — Delete note + file from storage
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Get note to find storage path
        const noteDoc = await db.collection('notes').doc(id).get();
        if (!noteDoc.exists) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const noteData = noteDoc.data();

        // Delete from Firebase Storage
        if (noteData.storagePath) {
            try {
                const bucket = getBucket();
                await bucket.file(noteData.storagePath).delete();
                console.log(`✅ Deleted file from storage: ${noteData.storagePath}`);
            } catch (storageErr) {
                console.warn(`⚠️ Failed to delete file from storage: ${storageErr.message}`);
                // Continue with Firestore deletion even if storage delete fails
            }
        }

        // Delete from Firestore
        await db.collection('notes').doc(id).delete();
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Delete Note Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
//  STUDENT ROUTES — Browse & View Notes
// ============================================================

// GET /api/notes/browse/:field — Get sections and notes for a field
router.get('/browse/:field', async (req, res) => {
    try {
        const { field } = req.params;
        const userField = req.user.category || req.user.selectedField;

        // Students can only see their own field's notes (admins can see all)
        // Bypassing strict 403 to allow fetching institute notes even if field mismatches slightly
        // if (req.user.role !== 'admin' && userField !== field) {
        //     return res.status(403).json({ error: 'You can only access notes for your registered field' });
        // }

        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const purchasedNotes = userData.purchasedNotes || [];
        const purchasedSections = userData.purchasedSections || [];
        const userInstituteCode = req.user.instituteCode || userData.instituteCode || '';

        // 1. Fetch by Field
        const fieldSectionsSnap = await db.collection('notesSections').where('field', '==', field).get();
        const sectionsDocsMap = new Map();
        fieldSectionsSnap.docs.forEach(d => sectionsDocsMap.set(d.id, d));

        // 2. Fetch by Institute Code (bypassing field check to ensure all institute content is visible)
        if (userInstituteCode && req.user.role !== 'admin') {
            const instSectionsSnap = await db.collection('notesSections').where('instituteCode', '==', userInstituteCode).get();
            instSectionsSnap.docs.forEach(d => sectionsDocsMap.set(d.id, d));
        }

        const sectionsSnapDocs = Array.from(sectionsDocsMap.values());

        // Fetch paid orders to check for bundled access
        const ordersSnap = await db.collection('orders')
            .where('userId', '==', req.user.uid)
            .where('status', '==', 'paid')
            .get();

        const bundledNotes = new Set();
        const bundledSections = new Set();

        for (const orderDoc of ordersSnap.docs) {
            const seriesId = orderDoc.data().seriesId;
            if (!seriesId) continue;
            const seriesDoc = await db.collection('testSeries').doc(seriesId).get();
            if (seriesDoc.exists) {
                const sData = seriesDoc.data();
                (sData.includedNotes || []).forEach(nId => bundledNotes.add(nId));
                (sData.includedSections || []).forEach(sId => bundledSections.add(sId));
            }
        }

        const snapshotSections = sectionsSnapDocs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(s => s.isActive !== false)
            .filter(s => {
                const sCode = s.instituteCode || '';
                return req.user.role === 'admin' || !sCode || sCode === userInstituteCode;
            })
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        // Get notes for this field
        const fieldNotesSnap = await db.collection('notes').where('field', '==', field).get();
        const notesDocsMap = new Map();
        fieldNotesSnap.docs.forEach(d => notesDocsMap.set(d.id, d));

        // Get institute notes
        if (userInstituteCode && req.user.role !== 'admin') {
            const instNotesSnap = await db.collection('notes').where('instituteCode', '==', userInstituteCode).get();
            instNotesSnap.docs.forEach(d => notesDocsMap.set(d.id, d));
        }

        const allNotes = Array.from(notesDocsMap.values())
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(n => n.isActive !== false)
            .filter(n => {
                const nCode = n.instituteCode || '';
                return req.user.role === 'admin' || !nCode || nCode === userInstituteCode;
            })
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        const sections = snapshotSections.map(data => {
            const isDirectlyPurchased = purchasedSections.includes(data.id) || bundledSections.has(data.id);
            // If parent is purchased, child is also purchased
            const isParentPurchased = data.parentId && (purchasedSections.includes(data.parentId) || bundledSections.has(data.parentId));
            
            return {
                id: data.id,
                title: data.title,
                field: data.field,
                type: data.type,
                price: data.price || 499,
                icon: data.icon || '📂',
                parentId: data.parentId || null,
                instituteCode: data.instituteCode || '',
                isPurchased: isDirectlyPurchased || isParentPurchased
            };
        });

        const notes = allNotes.map(data => {
            const isDirectlyPurchased = purchasedNotes.includes(data.id) || bundledNotes.has(data.id);
            const isSectionPurchased = data.sectionId && (purchasedSections.includes(data.sectionId) || bundledSections.has(data.sectionId));
            
            // Check grand-parent if section has a parent
            const section = sections.find(s => s.id === data.sectionId);
            const isParentSectionPurchased = section?.parentId && (purchasedSections.includes(section.parentId) || bundledSections.has(section.parentId));

            return {
                id: data.id,
                title: data.title,
                sectionId: data.sectionId,
                type: data.type,
                price: data.price || 99,
                fileName: data.fileName,
                fileSize: data.fileSize,
                isDownloadable: data.isDownloadable,
                instituteCode: data.instituteCode || '',
                createdAt: data.createdAt,
                isPurchased: isDirectlyPurchased || isSectionPurchased || isParentSectionPurchased
            };
        });

        // Build tree structure
        const parentSections = sections.filter(s => !s.parentId);
        const tree = parentSections.map(parent => ({
            ...parent,
            subsections: sections.filter(s => s.parentId === parent.id).map(sub => ({
                ...sub,
                notes: notes.filter(n => n.sectionId === sub.id)
            })),
            notes: notes.filter(n => n.sectionId === parent.id)
        }));

        res.json({ field, sections: tree, totalNotes: notes.length });
    } catch (error) {
        console.error('Browse Notes Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notes/:id/view — Get single note for viewing
router.get('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const noteDoc = await db.collection('notes').doc(id).get();

        if (!noteDoc.exists) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const noteData = noteDoc.data();
        
        // Fetch section info immediately to check for section-level lock
        const sectionDoc = noteData.sectionId ? await db.collection('notesSections').doc(noteData.sectionId).get() : null;
        const sectionData = sectionDoc?.exists ? sectionDoc.data() : null;

        const isNotePaid = noteData.type === 'paid';
        const isSectionPaid = sectionData?.type === 'paid';

        // Admins always get access
        if (req.user.role !== 'admin') {
            const userField = req.user.category || req.user.selectedField;
            if (userField !== noteData.field) {
                return res.status(403).json({ error: 'Access denied: Field mismatch' });
            }

            // If either note or section is paid, check access
            if (isNotePaid || isSectionPaid) {
                let hasPaidAccess = false;

                // Fetch user doc for purchased notes/sections
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                const purchasedNotes = userData.purchasedNotes || [];
                const purchasedSections = userData.purchasedSections || [];

                // Check 1: User directly purchased this note
                if (purchasedNotes.includes(id)) {
                    hasPaidAccess = true;
                }

                // Check 2: User purchased the section this note belongs to (immediate)
                if (!hasPaidAccess && noteData.sectionId && purchasedSections.includes(noteData.sectionId)) {
                    hasPaidAccess = true;
                }
                
                // Check 3: If section has a parent, check if that was purchased
                if (!hasPaidAccess && sectionData?.parentId && purchasedSections.includes(sectionData.parentId)) {
                    hasPaidAccess = true;
                }

                // Check 4: User has a paid test series that bundles this note/section
                if (!hasPaidAccess) {
                    const ordersSnap = await db.collection('orders')
                        .where('userId', '==', req.user.uid)
                        .where('status', '==', 'paid')
                        .get();

                    for (const orderDoc of ordersSnap.docs) {
                        const orderData = orderDoc.data();
                        const seriesId = orderData.seriesId;
                        if (!seriesId) continue;

                        const seriesDoc = await db.collection('testSeries').doc(seriesId).get();
                        if (!seriesDoc.exists) continue;
                        const seriesData = seriesDoc.data();

                        const bundledSections = seriesData.includedSections || [];
                        const bundledNotes = seriesData.includedNotes || [];

                        if (
                            bundledNotes.includes(id) ||
                            (noteData.sectionId && bundledSections.includes(noteData.sectionId)) ||
                            (sectionData?.parentId && bundledSections.includes(sectionData.parentId))
                        ) {
                            hasPaidAccess = true;
                            break;
                        }
                    }
                }

                if (!hasPaidAccess) {
                    const sectionTitle = sectionData?.title || 'Unknown Section';
                    const sectionPrice = sectionData?.price || 499;
                    const notePrice = noteData.price || 99;

                    return res.status(403).json({
                        error: 'Premium Content',
                        isPremium: true,
                        noteId: noteDoc.id,
                        noteTitle: noteData.title,
                        sectionId: noteData.sectionId || null,
                        sectionTitle,
                        notePrice,
                        sectionPrice,
                        field: noteData.field,
                    });
                }
            }
        }

        res.json({
            id: noteDoc.id,
            title: noteData.title,
            field: noteData.field,
            type: noteData.type,
            fileUrl: noteData.fileUrl,
            fileName: noteData.fileName,
            fileSize: noteData.fileSize,
            isDownloadable: noteData.isDownloadable,
            sectionId: noteData.sectionId,
            createdAt: noteData.createdAt
        });
    } catch (error) {
        console.error('View Note Error:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
