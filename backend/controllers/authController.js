const { db, auth } = require('../config/firebaseAdmin');

// @desc    Send OTP to Email (Simulation)
// @route   POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store in Firestore (simulated session)
        await db.collection('otp_codes').doc(email).set({
            otp,
            expiresAt
        });

        // SIMULATION: Log to console instead of sending email
        console.log(`\n📨 [EMAIL SIMULATION] To: ${email} | OTP: ${otp} \n`);

        res.status(200).json({ message: 'OTP sent successfully (Check server console)' });
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
