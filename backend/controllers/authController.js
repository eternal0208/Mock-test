const { db } = require('../config/firebaseAdmin');

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
