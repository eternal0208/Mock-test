const express = require('express');
const router = express.Router();
const {
    enrollFreeTest,
    createPaidOrder,
    verifyPayment,
    checkAccess,
    getMyOrders
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/purchases/enroll-free
// @desc    Instantly enroll user in free test series
// @access  Private
router.post('/enroll-free', enrollFreeTest);

// @route   POST /api/purchases/create-order
// @desc    Create Razorpay order for paid test series
// @access  Private
router.post('/create-order', createPaidOrder);

// @route   POST /api/purchases/verify-payment
// @desc    Verify Razorpay payment and enroll user
// @access  Private
router.post('/verify-payment', verifyPayment);

// @route   GET /api/purchases/check-access/:testId
// @desc    Check if user has access to a test series
// @access  Private
router.get('/check-access/:testId', checkAccess);

// @route   GET /api/purchases/my-orders
// @desc    Get all orders for authenticated user
// @access  Private
router.get('/my-orders', protect, getMyOrders);

module.exports = router;
