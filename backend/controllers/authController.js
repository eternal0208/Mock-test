const { db, auth } = require('../config/firebaseAdmin');

// @desc    Sync User (Create or Update)
// @route   POST /api/auth/sync
exports.syncUser = async (req, res) => {
    console.log("👉 Sync Request Body:", req.body);
    const { name, email, firebaseUid, role, phoneNumber, phone, class: studentClass, interest, targetExam, state, city, authProvider, photoURL } = req.body;

    if (!firebaseUid) {
        console.error("❌ Missing firebaseUid");
        return res.status(400).json({ message: 'Firebase UID is required' });
    }

    if (!db) {
        console.error("❌ Firestore DB is NOT initialized. Check Vercel Env Vars.");
        return res.status(503).json({ message: 'Database Connection Failed (Service Account Missing)' });
    }

    try {
        const userRef = db.collection('users').doc(firebaseUid);
        const doc = await userRef.get();

        if (doc.exists) {
            // EXISTING USER - Update with partial data
            const userData = doc.data();

            // Check if user is BLOCKED
            if (userData.status === 'blocked') {
                console.warn(`⛔ Blocked user attempted login: ${firebaseUid}`);
                return res.status(403).json({
                    message: 'Your account has been blocked by the administrator. Please contact support.',
                    error: 'ACCOUNT_BLOCKED'
                });
            }

            console.log(`✅ User exists: ${firebaseUid}. Updating...`);
            const finalPhone = phone || phoneNumber || userData.phoneNumber || userData.phone || null;
            await userRef.update({
                name: name || userData.name,
                email: email || userData.email || '',
                phone: finalPhone,
                phoneNumber: finalPhone, // Legacy support
                photoURL: photoURL || userData.photoURL || '',
                class: studentClass || userData.class || '',
                interest: interest || userData.interest || '',
                state: state || userData.state || '',
                city: city || userData.city || '',
                authProvider: authProvider || userData.authProvider || 'phone',
                targetExam: targetExam || userData.targetExam || '', // Legacy support
                updatedAt: new Date().toISOString()
            });
            const updatedDoc = await userRef.get();
            return res.status(200).json({ _id: updatedDoc.id, ...updatedDoc.data() });
        }

        // NEW USER - Require ALL fields
        console.log(`🆕 Creating new user: ${firebaseUid}`);

        // Strict validation for new users
        const missingFields = [];
        const requestPhone = phone || phoneNumber;

        if (!name || name.trim() === '') missingFields.push('name');
        if (!email || email.trim() === '') missingFields.push('email');
        if (!requestPhone || requestPhone.trim() === '') missingFields.push('phone');
        if (!studentClass || studentClass.trim() === '') missingFields.push('class');
        if (!interest || interest.trim() === '') missingFields.push('interest');
        if (!state || state.trim() === '') missingFields.push('state');
        if (!city || city.trim() === '') missingFields.push('city');

        if (missingFields.length > 0) {
            console.error(`❌ Missing required fields for new user: ${missingFields.join(', ')}`);
            return res.status(400).json({
                message: 'All fields are required for new users',
                missingFields,
                required: ['name', 'email', 'phone', 'class', 'interest', 'state', 'city']
            });
        }

        const finalPhone = phone || phoneNumber;
        const newUser = {
            name: name.trim(),
            email: email.trim(),
            phone: finalPhone,
            phoneNumber: finalPhone, // Legacy support
            photoURL: photoURL || '',
            class: studentClass.trim(),
            interest: interest.trim(),
            state: state.trim(),
            city: city.trim(),
            authProvider: authProvider || 'google',
            firebaseUid,
            role: role || 'student',
            status: 'active',
            purchasedTests: [], // Initialize empty array
            createdAt: new Date().toISOString()
        };

        if (targetExam) newUser.targetExam = targetExam;

        await userRef.set(newUser);
        console.log(`✅ New user created successfully: ${firebaseUid}`);
        res.status(201).json({ _id: firebaseUid, ...newUser });

    } catch (error) {
        console.error("🔥 Sync User Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
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
    const { email, phone } = req.query;
    if (!email && !phone) return res.status(400).json({ message: 'Email or Phone is required query param' });

    try {
        let userQuery;
        if (email) {
            userQuery = await db.collection('users').where('email', '==', email).get();
        } else {
            userQuery = await db.collection('users').where('phoneNumber', '==', phone).get();
        }

        if (userQuery.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userDoc = userQuery.docs[0];
        await db.collection('users').doc(userDoc.id).update({
            role: 'admin',
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({
            message: `User ${email || phone} promoted to ADMIN successfully. Please Logout and Login again.`
        });
    } catch (error) {
        console.error("Setup Admin Error:", error);
        res.status(500).json({ message: error.message });
    }
};
