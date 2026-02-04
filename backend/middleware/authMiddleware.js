const { auth, db } = require('../config/firebaseAdmin');

// Middleware to protect routes and get user details
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
        // 1. Verify Token
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // 2. Fetch User from Firestore to get Role & Selected Field
        const userDoc = await db.collection('users').doc(uid).get();

        let userData = {};
        if (userDoc.exists) {
            userData = userDoc.data();
            // console.log(`🔍 [Auth Debug] DB User Data for ${uid}:`, JSON.stringify(userData));
        } else {
            // Optional: Log that a user without a profile is accessing
            console.log(`ℹ️ Access by user without profile: ${uid}`);
        }

        // 3. Attach User to Request
        req.user = {
            uid: uid,
            _id: uid, // Alias for consistency
            email: decodedToken.email,
            role: userData.role || 'student',
            // Normalize Field/Category to 'selectedField' for Controller Logic
            selectedField: userData.selectedField || userData.interest || userData.targetExam || null,
            targetExam: userData.targetExam || userData.selectedField || null, // Keeping both for safety
            ...userData
        };

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Middleware to restrict access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
