const path = require('path');
const dotenv = require('dotenv');
// Load .env from same directory
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

const normalize = (v) => {
    if (v === null || v === undefined) return '';
    return String(v).trim();
};

async function debugResult(resultId) {
    try {
        const resDoc = await db.collection('results').doc(resultId).get();
        if (!resDoc.exists) {
            console.log("Result not found");
            return;
        }
        const result = resDoc.data();
        let testId = result.testId;
        if (testId && typeof testId === 'object') testId = testId._id;

        console.log("--- RESULT DATA ---");
        console.log("ID:", resultId);
        console.log("TestID:", testId);
        console.log("Score:", result.score);
        console.log("Attempt Data Count:", result.attempt_data?.length);

        if (result.attempt_data && result.attempt_data.length > 0) {
            const att = result.attempt_data[0];
            console.log("Sample Attempt [0]:", {
                questionId: att.questionId,
                questionText: att.questionText?.substring(0, 30),
                selectedOption: att.selectedOption,
                isCorrect: att.isCorrect,
                correctAnswer: att.correctAnswer,
                correctOptions: att.correctOptions
            });
        }

        const testDoc = await db.collection('tests').doc(testId).get();
        if (!testDoc.exists) {
            console.log("Test not found");
            return;
        }
        const test = testDoc.data();
        console.log("\n--- TEST DATA ---");
        console.log("Question Count:", test.questions?.length);

        if (test.questions && test.questions.length > 0) {
            const q = test.questions[0];
            console.log("Sample Question [0]:", {
                _id: q._id,
                text: q.text?.substring(0, 30),
                correctOption: q.correctOption,
                correctOptions: q.correctOptions,
                optionsCount: q.options?.length
            });
        }

        console.log("\n--- MATCHING DEBUG ---");
        result.attempt_data.forEach((att, i) => {
            const qById = test.questions.find(q => q._id === att.questionId);
            const qByText = test.questions.find(q => normalize(q.text) === normalize(att.questionText));
            const qByIndex = test.questions[i];

            console.log(`Q${i + 1}: ID Match: ${!!qById}, Text Match: ${!!qByText}, Index Match ID: ${qByIndex?._id}`);
            if (!qById && !qByText) {
                console.log(`   [FAIL] No match for ${att.questionId} / "${att.questionText?.substring(0, 20)}..."`);
            }
        });

    } catch (err) {
        console.error("Debug Error:", err);
    }
}

async function run() {
    const snap = await db.collection('results').orderBy('submittedAt', 'desc').limit(1).get();
    if (snap.empty) {
        console.log("No results in DB");
        return;
    }
    const id = snap.docs[0].id;
    await debugResult(id);
    process.exit(0);
}

run();
