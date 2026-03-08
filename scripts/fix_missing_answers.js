const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
            })
        });
        console.log("✅ Firebase Admin Initialized");
    } catch (error) {
        console.error("❌ Firebase Admin Initialization Failed:", error);
        process.exit(1);
    }
}

const db = admin.firestore();

async function scanAndIdentifyBrokenTests() {
    console.log("🔍 Scanning for tests with missing answer keys...");
    const testsSnapshot = await db.collection('tests').get();

    let totalBrokenCount = 0;
    let testsRequiringFix = [];

    testsSnapshot.forEach(doc => {
        const data = doc.data();
        const questions = data.questions || [];
        let isBroken = false;
        let brokenQs = [];

        questions.forEach((q, idx) => {
            let missing = false;
            if (q.type === 'mcq' && q.correctOption === undefined) missing = true;
            if (q.type === 'msq' && (q.correctOptions === undefined || q.correctOptions.length === 0)) missing = true;
            if (q.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === '')) missing = true;

            if (missing) {
                isBroken = true;
                brokenQs.push(idx + 1);
            }
        });

        if (isBroken) {
            totalBrokenCount++;
            console.warn(`🚨 Test ID: ${doc.id} | Title: "${data.title}" | Broken Qs: ${brokenQs.join(', ')}`);
            testsRequiringFix.push({ id: doc.id, questions: data.questions, brokenIndices: brokenQs.map(i => i - 1) });
        }
    });

    console.log(`\nFound ${totalBrokenCount} broken tests out of ${testsSnapshot.size}.`);

    if (totalBrokenCount > 0) {
        console.log("\n--- REPAIR LOGIC ---");
        console.log("You can implement auto-repair here or fix them manually in the Admin Panel.");
        console.log("Recommended action: Open these tests in the Admin Panel, find the broken questions, mark the correct answers, and SAVE.");
    }
}

scanAndIdentifyBrokenTests().catch(console.error);
