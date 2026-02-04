const { db, auth } = require('../config/firebaseAdmin');

// @desc    Sync User (Create or Update)
// @route   POST /api/auth/sync
exports.syncUser = async (req, res) => {
    // Security: Use UID from Token (req.user) if available (via protect middleware)
    const uidFromToken = req.user ? req.user.uid : null;
    const { name, email, firebaseUid, role, phoneNumber, phone, class: studentClass, category, state, city, authProvider, photoURL } = req.body;

    // Use token UID as source of truth, fall back to body only if middleware missing (shouldn't happen now)
    const targetUid = uidFromToken || firebaseUid;

    if (!targetUid) {
        return res.status(400).json({ message: 'Firebase UID is required' });
    }

    if (!db) {
        return res.status(503).json({ message: 'Database Connection Failed' });
    }

    try {
        const userRef = db.collection('users').doc(targetUid);
        const doc = await userRef.get();

        if (doc.exists) {
            // EXISTING USER - Update
            const userData = doc.data();

            if (userData.status === 'blocked') {
                return res.status(403).json({ message: 'Account blocked' });
            }

            console.log(`✅ User exists: ${targetUid}. Updating...`);
            const finalPhone = phone || phoneNumber || userData.phoneNumber;

            await userRef.update({
                name: name || userData.name,
                email: email || userData.email,
                phone: finalPhone,
                phoneNumber: finalPhone,
                photoURL: photoURL || userData.photoURL || '',
                class: studentClass || userData.class || '',
                category: category || userData.category || '', // Unified Field
                state: state || userData.state || '',
                city: city || userData.city || '',
                authProvider: authProvider || userData.authProvider || 'phone',
                updatedAt: new Date().toISOString()
            });

            const updatedDoc = await userRef.get();
            return res.status(200).json({ _id: updatedDoc.id, ...updatedDoc.data() });
        }

        // NEW USER
        console.log(`🆕 Creating new user: ${targetUid}`);

        // Strict validation
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!email) missingFields.push('email');
        if (!phone && !phoneNumber) missingFields.push('phone');
        if (!category) missingFields.push('category'); // Strict check for category

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: 'Missing required fields',
                missingFields
            });
        }

        const finalPhone = phone || phoneNumber;
        const newUser = {
            name: name.trim(),
            email: email.trim(),
            phone: finalPhone,
            phoneNumber: finalPhone,
            photoURL: photoURL || '',
            class: studentClass ? studentClass.trim() : '',
            category: category.trim(), // Unified
            state: state ? state.trim() : '',
            city: city ? city.trim() : '',
            authProvider: authProvider || 'google',
            firebaseUid: targetUid,
            role: role || 'student',
            status: 'active',
            purchasedTests: [],
            createdAt: new Date().toISOString()
        };

        await userRef.set(newUser);
        res.status(201).json({ _id: targetUid, ...newUser });

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
