const express = require('express');
const router = express.Router();
const { syncUser, getAllUsers, sendOtp, verifyOtp } = require('../controllers/authController');

router.post('/sync', syncUser);
router.get('/users', getAllUsers);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;
