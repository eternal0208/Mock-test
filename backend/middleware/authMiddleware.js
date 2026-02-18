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
            category: userData.category || userData.targetExam || userData.selectedField || null, // Unified
            ...userData
        };

        next();
    } catch (error) {
        console.error('🔥 [Auth Middleware Error] Failed to verify token:', error.message);
        if (error.code === 'auth/id-token-expired') {
            console.error('❌ Token has expired');
        } else if (error.code === 'auth/argument-error') {
            console.error('❌ Invalid token format or missing token');
        }
        return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
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

// Middleware that attaches user if token exists, but doesn't block if not
exports.optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(); // Proceed as Guest
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;
        const userDoc = await db.collection('users').doc(uid).get();

        let userData = {};
        if (userDoc.exists) {
            userData = userDoc.data();
        }

        req.user = {
            uid: uid,
            _id: uid,
            email: decodedToken.email,
            role: userData.role || 'student',
            category: userData.category || userData.targetExam || userData.selectedField || null,
            ...userData
        };
        next();
    } catch (error) {
        // If token invalid, proceed as guest or warn? 
        // Better to treat as guest to avoid blocking valid public access if stale token exists
        console.warn('⚠️ [Optional Auth] Token validation failed, proceeding as Guest:', error.message);
        next();
    }
};
