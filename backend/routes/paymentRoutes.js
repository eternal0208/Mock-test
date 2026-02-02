const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { db } = require('../config/firebaseAdmin');
const Order = require('../models/Order');
const User = require('../models/User');

// Initialize Razorpay (Use Dummy Keys for Development if not provided)
// User should replace these with actual keys in .env
const admin = require('firebase-admin'); // Move to top

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_1234567890'
});

// Get All Orders (Admin)
router.get('/orders', async (req, res) => {
    try {
        // ideally add admin auth middleware here
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();

        let orders = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            let userName = 'Unknown';
            let itemName = 'Unknown Item';

            // Enhance with User Name
            try {
                if (data.userId) {
                    const userDoc = await db.collection('users').doc(data.userId).get();
                    if (userDoc.exists) userName = userDoc.data().name;
                }
            } catch (e) { }

            // Enhance with Item Name
            try {
                if (data.seriesId) {
                    // Check Test Series first
                    let itemDoc = await db.collection('testSeries').doc(data.seriesId).get();
                    if (itemDoc.exists) itemName = itemDoc.data().title;
                    else {
                        // Check Tests
                        itemDoc = await db.collection('tests').doc(data.seriesId).get();
                        if (itemDoc.exists) itemName = itemDoc.data().title;
                    }
                }
            } catch (e) { }

            orders.push({
                id: doc.id,
                ...data,
                userName,
                itemName
            });
        }
        res.json(orders);
    } catch (error) {
        console.error("Fetch Orders Error:", error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
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

        console.log(`Verifying Payment: User ${userId}, Item ${seriesId}, Order ${razorpay_order_id}`);

        if (!userId || !seriesId) {
            return res.status(400).json({ success: false, error: 'Missing userId or seriesId' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        let isValid = false;

        // DEMO MODE BYPASS
        if (razorpay_signature === 'DEMO_SUCCESS_SIGNATURE') {
            console.log("Processing DEMO Payment...");
            isValid = true;
        } else {
            // Real Verification
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_1234567890')
                .update(body.toString())
                .digest('hex');

            if (expectedSignature === razorpay_signature) {
                isValid = true;
            }
        }

        if (isValid) {
            // 1. Update Order Status
            const ordersRef = db.collection('orders');
            const snapshot = await ordersRef.where('razorpayOrderId', '==', razorpay_order_id).get();

            if (!snapshot.empty) {
                await ordersRef.doc(snapshot.docs[0].id).update({
                    status: 'paid',
                    paymentId: razorpay_payment_id,
                    updatedAt: new Date().toISOString()
                });
            }

            // 2. Grant Access
            const userRef = db.collection('users').doc(userId);

            // Use set with merge: true to ensure document/field exists
            await userRef.set({
                purchasedTests: admin.firestore.FieldValue.arrayUnion(seriesId)
            }, { merge: true });

            console.log("Payment Verified & Access Granted");
            res.json({ success: true, message: 'Payment verified and access granted' });
        } else {
            console.warn("Invalid Signature");
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ error: 'Verification failed: ' + error.message });
    }
});

module.exports = router;
