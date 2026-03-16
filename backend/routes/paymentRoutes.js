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

// --- Helper: Validate a coupon code and return discount info ---
const validateCouponHelper = async (code, userId, seriesId, examType, originalPrice) => {
    const upperCode = code.toUpperCase().trim();
    const snap = await db.collection('coupons').where('code', '==', upperCode).get();

    if (snap.empty) return { valid: false, reason: 'Coupon code not found' };

    const doc = snap.docs[0];
    const coupon = { id: doc.id, ...doc.data() };

    if (!coupon.isActive) return { valid: false, reason: 'This coupon is no longer active' };

    // Validity dates
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
        return { valid: false, reason: 'This coupon is not yet valid' };
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
        return { valid: false, reason: 'This coupon has expired' };
    }

    // Max total uses
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        return { valid: false, reason: 'This coupon has reached its maximum usage limit' };
    }

    // Per-user limit
    if (coupon.maxUsesPerUser > 0) {
        const userUsages = (coupon.usages || []).filter(u => u.userId === userId);
        if (userUsages.length >= coupon.maxUsesPerUser) {
            return { valid: false, reason: `You have already used this coupon ${coupon.maxUsesPerUser} time(s)` };
        }
    }

    // Applicable fields
    const fields = coupon.applicableFields || ['all'];
    if (!fields.includes('all') && examType && !fields.includes(examType)) {
        return { valid: false, reason: `This coupon is not valid for ${examType} test series` };
    }

    // Calculate discount
    let discountAmount = 0;
    let finalPrice = originalPrice;

    if (coupon.discountType === 'free') {
        discountAmount = originalPrice;
        finalPrice = 0;
    } else if (coupon.discountType === 'percent') {
        discountAmount = Math.round((originalPrice * coupon.discountValue) / 100);
        finalPrice = Math.max(0, originalPrice - discountAmount);
    } else if (coupon.discountType === 'flat') {
        discountAmount = Math.min(coupon.discountValue, originalPrice);
        finalPrice = Math.max(0, originalPrice - discountAmount);
    }

    return {
        valid: true,
        couponId: coupon.id,
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalPrice,
        isFree: finalPrice === 0,
        message: `Coupon applied! You save ₹${discountAmount}.`
    };
};

// POST /api/payment/validate-coupon — Check coupon validity and return final price
router.post('/validate-coupon', async (req, res) => {
    try {
        const { code, userId, seriesId, examType } = req.body;
        if (!code || !userId || !seriesId) {
            return res.status(400).json({ valid: false, reason: 'code, userId, and seriesId are required' });
        }

        // Fetch series to get original price  
        const seriesDoc = await db.collection('testSeries').doc(seriesId).get();
        if (!seriesDoc.exists) return res.status(404).json({ valid: false, reason: 'Test series not found' });
        const originalPrice = Number(seriesDoc.data().price) || 0;

        const result = await validateCouponHelper(code, userId, seriesId, examType || seriesDoc.data().examType, originalPrice);
        res.json(result);
    } catch (error) {
        console.error('Validate Coupon Error:', error);
        res.status(500).json({ valid: false, reason: 'Server error' });
    }
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

// Create Order Route (supports optional couponCode)
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', seriesId, userId, couponCode } = req.body;

        if (!userId || !seriesId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Server-side validate coupon if provided
        let appliedCoupon = null;
        let finalAmount = Number(amount);

        if (couponCode) {
            const seriesDoc = await db.collection('testSeries').doc(seriesId).get();
            const originalPrice = seriesDoc.exists ? (Number(seriesDoc.data().price) || finalAmount) : finalAmount;
            const examType = seriesDoc.exists ? seriesDoc.data().examType : null;
            const couponResult = await validateCouponHelper(couponCode, userId, seriesId, examType, originalPrice);
            if (couponResult.valid) {
                finalAmount = couponResult.finalPrice;
                appliedCoupon = couponResult;
            }
        }

        // If coupon makes it free, short-circuit Razorpay
        if (finalAmount <= 0) {
            return res.json({ isFree: true, coupon: appliedCoupon, amount: 0 });
        }

        const options = {
            amount: Math.round(finalAmount * 100), // Amount in paise
            currency,
            receipt: `receipt_${Date.now()}_${userId.slice(0, 5)}`,
        };

        const order = await razorpay.orders.create(options);

        // Save Order to Firestore (Status: Created)
        const orderData = new Order({
            userId,
            seriesId,
            amount: finalAmount,
            originalAmount: Number(amount),
            currency,
            razorpayOrderId: order.id,
            status: 'created',
            couponCode: appliedCoupon ? appliedCoupon.couponCode : null,
            discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0
        });

        await db.collection('orders').add(orderData.toFirestore());

        res.json({ ...order, coupon: appliedCoupon });
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Payment Route — also records coupon usage
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, seriesId, couponCode } = req.body;

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

            // 3. Record coupon usage if coupon was applied
            if (couponCode) {
                try {
                    const couponSnap = await db.collection('coupons').where('code', '==', couponCode.toUpperCase()).get();
                    if (!couponSnap.empty) {
                        const couponRef = db.collection('coupons').doc(couponSnap.docs[0].id);
                        await couponRef.update({
                            usedCount: admin.firestore.FieldValue.increment(1),
                            usages: admin.firestore.FieldValue.arrayUnion({
                                userId,
                                seriesId,
                                usedAt: new Date().toISOString()
                            })
                        });
                    }
                } catch (couponErr) {
                    console.error('Failed to record coupon usage:', couponErr.message);
                }
            }

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

