const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const TestSeries = require('../models/TestSeries');
const { getPercentileData, updatePercentileData } = require('../models/PercentileData');

// --- Middleware to Check Admin Role (Simplified for now, assumes middleware used in index.js or check here) ---
// For this task, we'll assume the /api/admin/* routes are protected or we trust the frontend checking role for now.
// Ideally: Use authMiddleware and check if user.role === 'admin'.

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
        const snapshot = await db.collection('testSeries').get();
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

// --- Analytics & User Management ---

// GET /api/admin/students - List All Students
router.get('/students', async (req, res) => {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get(); // Fetch ALL users to manage roles
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

        await db.collection('users').doc(id).update({
            role,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `User role updated to ${role}` });
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

            // Fetch series title if not already stored
            if (!itemName || itemName === 'Unknown Item') {
                try {
                    if (order.seriesId) {
                        const seriesDoc = await db.collection('testSeries').doc(order.seriesId).get();
                        if (seriesDoc.exists) itemName = seriesDoc.data().title;
                    }
                } catch (e) { }
            }

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
                createdAt: order.createdAt
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


// POST /api/admin/rescore-all-results
// Re-scores all existing results using the fixed correctOption comparison logic
router.post('/rescore-all-results', async (req, res) => {
    try {
        // Helper: resolve letter-format correctOption to actual text
        const resolveCorrectOption = (question) => {
            if (!question.correctOption) return null;
            const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const letter = String(question.correctOption).trim().toUpperCase();
            if (letterToIdx[letter] !== undefined && question.options) {
                const idx = letterToIdx[letter];
                return question.options[idx] || `Option ${idx + 1}`;
            }
            return question.correctOption;
        };

        const resultsSnap = await db.collection('results').get();
        let updated = 0, skipped = 0, errors = 0;

        for (const resultDoc of resultsSnap.docs) {
            try {
                const result = resultDoc.data();
                const testId = result.testId;
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
                const newAttemptData = (result.attempt_data || []).map(att => {
                    const question = questionMap.get(att.questionId);
                    if (!question) return att; // Keep as-is if question not found

                    let isCorrect = false;
                    if (question.type === 'msq') {
                        const userAns = Array.isArray(att.selectedOption) ? att.selectedOption : [att.selectedOption];
                        const correctAns = question.correctOptions || [];
                        const sortedUser = [...userAns].sort();
                        const sortedCorrect = [...correctAns].sort();
                        isCorrect = sortedUser.length === sortedCorrect.length &&
                            sortedUser.every((val, i) => val === sortedCorrect[i]);
                    } else if (question.type === 'integer') {
                        isCorrect = String(att.selectedOption).trim() === String(question.integerAnswer).trim();
                    } else {
                        // MCQ — resolve letter format
                        const correctOptResolved = resolveCorrectOption(question);
                        isCorrect = correctOptResolved === att.selectedOption;
                    }

                    const isAttempted = att.selectedOption !== null && att.selectedOption !== undefined && att.selectedOption !== '';
                    if (isCorrect) {
                        score += Number(question.marks || 4);
                        correctCount++;
                    } else if (isAttempted) {
                        score -= Number(question.negativeMarks || 1);
                        wrongCount++;
                    }

                    return { ...att, isCorrect };
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

module.exports = router;

