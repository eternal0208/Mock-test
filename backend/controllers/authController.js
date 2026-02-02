const { sendEmail } = require('../services/emailService');

// @desc    Send OTP to Email
// @route   POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store in Firestore
        await db.collection('otp_codes').doc(email).set({
            otp,
            expiresAt
        });

        // Send Email via Nodemailer
        const subject = "Your Login OTP for Apex Mock";
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #4F46E5; text-align: center;">Apex Mock Login</h2>
                    <p style="font-size: 16px; color: #333;">Hello,</p>
                    <p style="font-size: 16px; color: #555;">Your One-Time Password (OTP) for login is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: bold; background: #EEF2FF; color: #4F46E5; padding: 10px 20px; letter-spacing: 5px; border-radius: 8px;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">This code is valid for 5 minutes.</p>
                </div>
            </div>
        `;

        const sent = await sendEmail(email, subject, message);

        if (sent) {
            res.status(200).json({ message: 'OTP sent to your email.' });
        } else {
            console.error("Failed to send email to client.");
            res.status(500).json({ message: 'Failed to send OTP email.' });
        }

    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

// @desc    Verify OTP and Login/Register
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    try {
        const otpDoc = await db.collection('otp_codes').doc(email).get();
        if (!otpDoc.exists) return res.status(400).json({ message: 'Invalid or expired OTP' });

        const data = otpDoc.data();
        if (data.otp !== otp || Date.now() > data.expiresAt) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // OTP Valid - Clean up
        await db.collection('otp_codes').doc(email).delete();

        // Check if user exists
        const userQuery = await db.collection('users').where('email', '==', email).get();
        let user;
        let uid;

        if (userQuery.empty) {
            // Create new user in Firestore
            uid = `email_${Date.now()}`; // Generate a custom UID or use email hash
            // Better: Create Firebase Auth User to get a real UID
            try {
                // Try to get user by email from Firebase Auth
                const firebaseUser = await auth.getUserByEmail(email);
                uid = firebaseUser.uid;
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    // Create in Firebase Auth
                    const newFirebaseUser = await auth.createUser({ email, emailVerified: true });
                    uid = newFirebaseUser.uid;
                } else {
                    throw e;
                }
            }

            const newUser = {
                name: 'Student', // Default name
                email,
                firebaseUid: uid,
                role: 'student',
                status: 'active',
                purchasedTests: [],
                createdAt: new Date().toISOString()
            };
            await db.collection('users').doc(uid).set(newUser);
            user = newUser;
        } else {
            user = userQuery.docs[0].data();
            uid = user.firebaseUid;
        }

        // Generate Custom Token
        const customToken = await auth.createCustomToken(uid);

        res.status(200).json({ token: customToken, user });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: 'Verification failed' });
    }
};

exports.syncUser = async (req, res) => {
    console.log("👉 Sync Request Body:", req.body);
    const { name, email, firebaseUid, role, phoneNumber, class: studentClass, targetExam } = req.body;

    if (!email || !firebaseUid) {
        console.error("❌ Missing fields:", { email, firebaseUid });
        return res.status(400).json({ message: 'Email and Firebase UID are required' });
    }

    try {
        const userRef = db.collection('users').doc(firebaseUid);
        const doc = await userRef.get();

        if (doc.exists) {
            console.log(`✅ User exists: ${email}. Updating...`);
            await userRef.update({
                name: name || doc.data().name,
                email,
                phoneNumber: phoneNumber || doc.data().phoneNumber || '',
                class: studentClass || doc.data().class || '',
                targetExam: targetExam || doc.data().targetExam || '',
                firebaseUid
            });
            const updatedDoc = await userRef.get();
            return res.status(200).json({ _id: updatedDoc.id, ...updatedDoc.data() });
        }

        console.log(`🆕 Creating new user: ${email}`);
        const newUser = {
            name: name || 'Student',
            email,
            phoneNumber: phoneNumber || '',
            class: studentClass || '',
            targetExam: targetExam || '',
            firebaseUid,
            role: role || 'student',
            status: 'active',
            purchasedTests: [], // Initialize empty array
            createdAt: new Date().toISOString()
        };

        await userRef.set(newUser);
        res.status(201).json({ _id: firebaseUid, ...newUser });

    } catch (error) {
        console.error("🔥 Sync User Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Admin
exports.getAllUsers = async (req, res) => {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({ _id: doc.id, ...doc.data() });
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Promote user to Admin (Temporary Utility)
// @route   GET /api/auth/setup-admin
exports.setupAdmin = async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required query param' });

    try {
        const userQuery = await db.collection('users').where('email', '==', email).get();
        if (userQuery.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userDoc = userQuery.docs[0];
        await db.collection('users').doc(userDoc.id).update({
            role: 'admin',
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({
            message: `User ${email} promoted to ADMIN successfully. Please Logout and Login again.`
        });
    } catch (error) {
        console.error("Setup Admin Error:", error);
        res.status(500).json({ message: error.message });
    }
};
