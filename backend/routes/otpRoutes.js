const express = require('express');
const router = express.Router();
const { sendGenericOtp, verifyGenericOtp } = require('../controllers/otpController');

router.post('/send', sendGenericOtp);
router.post('/verify', verifyGenericOtp);

module.exports = router;
