const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function deepScan(testId) {
    try {
        const doc = await db.collection('tests').doc(testId).get();
        if (!doc.exists) return console.log("Test not found");
        const test = doc.data();

        const allKeys = new Set();
        (test.questions || []).forEach(q => {
            Object.keys(q).forEach(k => allKeys.add(k));
        });

        console.log("--- DEEP KEY SCAN ---");
        console.log("All unique keys in questions:", Array.from(allKeys));

        // Find any field that contains 'A', 'B', 'C', or 'D' and is likely an answer
        const possibleAnswerFields = Array.from(allKeys).filter(k =>
            !['text', '_id', 'image', 'solution', 'subject', 'topic', 'type'].includes(k)
        );

        console.log("Scanning possible answer fields:", possibleAnswerFields);

        (test.questions || []).slice(0, 5).forEach((q, i) => {
            console.log(`Q${i + 1} Values:`);
            possibleAnswerFields.forEach(k => {
                if (q[k] !== undefined) console.log(`  ${k}: ${JSON.stringify(q[k])}`);
            });
        });

    } catch (err) {
        console.error(err);
    }
}

deepScan('gcGxtdKLCpfE5Sic5bU4').then(() => process.exit(0));
