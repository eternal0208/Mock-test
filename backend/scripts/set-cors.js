const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
}

async function setCors() {
    try {
        const bucketName = `${projectId}.firebasestorage.app`;
        const bucket = admin.storage().bucket(bucketName);
        console.log(`Setting CORS for bucket: ${bucketName}...`);

        await bucket.setCorsConfiguration([
            {
                origin: ['*'],
                method: ['GET', 'HEAD', 'OPTIONS'],
                responseHeader: ['Content-Type', 'Accept-Ranges', 'Content-Range', 'Content-Encoding', 'Range', 'Authorization'],
                maxAgeSeconds: 3600
            }
        ]);

        console.log("CORS updated successfully!");
    } catch (error) {
        console.error("Error setting CORS:", error);
    }
}

setCors();
