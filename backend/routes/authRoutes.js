const express = require('express');
const router = express.Router();
const { syncUser, getAllUsers, updateProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const { db } = require('../config/firebaseAdmin');

router.get('/institutes/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const snapshot = await db.collection('institutes').where('instituteCode', '==', code).limit(1).get();
        if (snapshot.empty) {
            return res.status(404).json({ valid: false, message: 'Institute code not found' });
        }
        const data = snapshot.docs[0].data();
        res.json({ valid: true, name: data.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sync', protect, syncUser);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, authorize('admin'), getAllUsers);

module.exports = router;
