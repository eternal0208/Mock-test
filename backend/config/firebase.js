const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Check if credentials are provided
if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("WARNING: Firebase Private Key not found in environment variables. Auth verification will fail.");
}

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
    console.log("Firebase Admin Initialized");
} catch (error) {
    console.error("Firebase Admin Initialization Error:", error.message);
}

module.exports = admin;
