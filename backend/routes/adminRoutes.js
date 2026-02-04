const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const TestSeries = require('../models/TestSeries');

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

// GET /api/admin/revenue - Calculate Total Revenue
router.get('/revenue', async (req, res) => {
    try {
        const snapshot = await db.collection('orders').where('status', '==', 'paid').get();
        const orders = snapshot.docs.map(doc => doc.data());

        const totalRevenue = orders.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const revenueBySeries = {};

        orders.forEach(order => {
            if (!revenueBySeries[order.seriesId]) {
                revenueBySeries[order.seriesId] = 0;
            }
            revenueBySeries[order.seriesId] += order.amount;
        });

        res.json({
            totalRevenue,
            totalOrders: orders.length,
            revenueBySeries
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
