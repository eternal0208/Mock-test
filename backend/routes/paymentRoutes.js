const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { db } = require('../config/firebaseAdmin');
const Order = require('../models/Order');
const User = require('../models/User');

// Initialize Razorpay (Use Dummy Keys for Development if not provided)
// User should replace these with actual keys in .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890', // Replace with real key for prod
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_1234567890'
});

// Create Order Route
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', seriesId, userId } = req.body;

        if (!userId || !seriesId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const options = {
            amount: amount * 100, // Amount in paise
            currency,
            receipt: `receipt_${Date.now()}_${userId.slice(0, 5)}`,
        };

        const order = await razorpay.orders.create(options);

        // Save Order to Firestore (Status: Created)
        const orderData = new Order({
            userId,
            seriesId,
            amount,
            currency,
            razorpayOrderId: order.id,
            status: 'created'
        });

        await db.collection('orders').add(orderData.toFirestore());

        res.json(order);
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Payment Route
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, seriesId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_1234567890')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment Success

            // 1. Update Order Status in Firestore
            const ordersRef = db.collection('orders');
            const snapshot = await ordersRef.where('razorpayOrderId', '==', razorpay_order_id).get();

            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                await ordersRef.doc(docId).update({
                    status: 'paid',
                    paymentId: razorpay_payment_id,
                    updatedAt: new Date().toISOString()
                });
            }

            // 2. Grant Access to User (Add seriesId or test to purchasedTests)
            // Note: seriesId in request body is used for the test ID here as per context
            const userRef = db.collection('users').doc(userId);

            // We need to fetch the user first to get current array or just use arrayUnion
            const { FieldValue } = require('firebase-admin/firestore');

            await userRef.update({
                purchasedTests: FieldValue.arrayUnion(seriesId)
            });

            res.json({ success: true, message: 'Payment verified and access granted' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;
