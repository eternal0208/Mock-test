const express = require('express');
const router = express.Router();
const { syncUser, getAllUsers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/sync', protect, syncUser);
router.get('/users', protect, authorize('admin'), getAllUsers);

module.exports = router;
