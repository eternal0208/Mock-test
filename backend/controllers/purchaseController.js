const { db } = require('../config/firebaseAdmin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_secret_key_here'
});

// @desc    Enroll in Free Test Series
// @route   POST /api/purchases/enroll-free
// @access  Private (Authenticated users only)
exports.enrollFreeTest = async (req, res) => {
    const { testId, userId } = req.body;

    if (!testId || !userId) {
        return res.status(400).json({ message: 'Test ID and User ID are required' });
    }

    try {
        // Fetch test details from Firestore
        const testRef = db.collection('testSeries').doc(testId);
        const testDoc = await testRef.get();

        if (!testDoc.exists) {
            return res.status(404).json({ message: 'Test series not found' });
        }

        const testData = testDoc.data();

        // SECURITY: Verify test is actually free (backend validation)
        if (testData.price > 0 && testData.isPaid === true) {
            return res.status(400).json({
                message: 'This is a paid test. Please use the payment flow.',
                isPaid: true
            });
        }

        // Create purchase record for free enrollment
        const purchaseRef = db.collection('purchases').doc(userId).collection('tests').doc(testId);

        const purchaseData = {
            testId,
            testTitle: testData.title || '',
            examType: testData.examType || '',
            amount: 0,
            isPaid: false,
            paymentId: null,
            orderId: null,
            enrolledAt: new Date().toISOString(),
            status: 'enrolled'
        };

        await purchaseRef.set(purchaseData);

        console.log(`✅ User ${userId} enrolled in free test ${testId}`);

        res.status(200).json({
            success: true,
            message: 'Successfully enrolled in test series',
            enrollment: purchaseData
        });

    } catch (error) {
        console.error('Free Enrollment Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create Razorpay Order for Paid Test
// @route   POST /api/purchases/create-order
// @access  Private
exports.createPaidOrder = async (req, res) => {
    const { testId, userId } = req.body;

    if (!testId || !userId) {
        return res.status(400).json({ message: 'Test ID and User ID are required' });
    }

    try {
        // Fetch test details from Firestore (SECURITY: Don't trust frontend price)
        const testRef = db.collection('testSeries').doc(testId);
        const testDoc = await testRef.get();

        if (!testDoc.exists) {
            return res.status(404).json({ message: 'Test series not found' });
        }

        const testData = testDoc.data();

        // SECURITY: Verify test is paid
        if (testData.price === 0 || testData.isPaid === false) {
            return res.status(400).json({
                message: 'This is a free test. Use the free enrollment endpoint.',
                isFree: true
            });
        }

        // Create Razorpay order with backend-validated price
        const options = {
            amount: testData.price * 100, // Convert to paise
            currency: testData.currency || 'INR',
            receipt: `rcpt_${testId.slice(0, 8)}_${Date.now()}`,
            notes: {
                testId,
                userId,
                testTitle: testData.title
            }
        };

        const order = await razorpay.orders.create(options);

        console.log(`✅ Order created for user ${userId}, test ${testId}, amount ${testData.price}`);

        res.status(200).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                testTitle: testData.title,
                testId
            }
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
};

// @desc    Verify Razorpay Payment and Enroll User
// @route   POST /api/purchases/verify-payment
// @access  Private
exports.verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        testId,
        userId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !testId || !userId) {
        return res.status(400).json({ message: 'Missing payment verification details' });
    }

    try {
        // SECURITY: Verify Razorpay signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_secret_key_here')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.error('❌ Payment signature verification failed');
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Invalid signature.'
            });
        }

        // Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return res.status(400).json({
                success: false,
                message: 'Payment not successful'
            });
        }

        // Fetch test details
        const testRef = db.collection('testSeries').doc(testId);
        const testDoc = await testRef.get();

        if (!testDoc.exists) {
            return res.status(404).json({ message: 'Test series not found' });
        }

        const testData = testDoc.data();

        // Create purchase record ONLY after successful verification
        const purchaseRef = db.collection('purchases').doc(userId).collection('tests').doc(testId);

        const purchaseData = {
            testId,
            testTitle: testData.title || '',
            examType: testData.examType || '',
            amount: payment.amount / 100, // Convert from paise to rupees
            isPaid: true,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            enrolledAt: new Date().toISOString(),
            status: 'enrolled',
            paymentStatus: payment.status
        };

        await purchaseRef.set(purchaseData);

        // EXTRA: Save to global 'orders' collection for Admin Revenue Tracking
        await db.collection('orders').add({
            userId,
            seriesId: testId,
            testTitle: testData.title || '',
            amount: payment.amount / 100,
            currency: payment.currency,
            status: 'paid',
            razorpayOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            createdAt: new Date().toISOString()
        });

        console.log(`✅ Payment verified and user ${userId} enrolled in test ${testId}`);

        res.status(200).json({
            success: true,
            message: 'Payment successful! You are now enrolled.',
            enrollment: purchaseData
        });

    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

// @desc    Check if user has access to test
// @route   GET /api/purchases/check-access/:testId
// @access  Private
exports.checkAccess = async (req, res) => {
    const { testId } = req.params;
    const { userId } = req.query;

    if (!testId || !userId) {
        return res.status(400).json({ message: 'Test ID and User ID are required' });
    }

    try {
        // Check if purchase record exists
        const purchaseRef = db.collection('purchases').doc(userId).collection('tests').doc(testId);
        const purchaseDoc = await purchaseRef.get();

        if (purchaseDoc.exists) {
            return res.status(200).json({
                hasAccess: true,
                enrollment: purchaseDoc.data()
            });
        }

        // Check if test is free
        const testRef = db.collection('testSeries').doc(testId);
        const testDoc = await testRef.get();

        if (testDoc.exists) {
            const testData = testDoc.data();
            if (testData.price === 0 || testData.isPaid === false) {
                return res.status(200).json({
                    hasAccess: false,
                    isFree: true,
                    message: 'Free test - enrollment available'
                });
            }
        }

        res.status(200).json({
            hasAccess: false,
            isFree: false,
            message: 'No access - purchase required'
        });

    } catch (error) {
        console.error('Check Access Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get My Orders
// @route   GET /api/purchases/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
    const userId = req.user.uid; // Assumes middleware sets req.user

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('userId', '==', userId).get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt in JS to avoid needing a Firestore composite index
        orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        res.status(200).json(orders);
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
};
