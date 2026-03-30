const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.warn("⚠️ Firebase Admin credentials missing. Skipping initialization.");
        } else {
            // Unescape private key for Vercel compatibility
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
            console.log("✅ Firebase Admin Initialized Successfully");
        }
    } catch (error) {
        console.error("❌ Firebase Admin Initialization Failed:", error.message);
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
