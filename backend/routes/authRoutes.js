const express = require('express');
const router = express.Router();
const { syncUser, getAllUsers, updateProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/sync', protect, syncUser);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, authorize('admin'), getAllUsers);

module.exports = router;
