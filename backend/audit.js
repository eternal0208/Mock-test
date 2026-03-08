const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function audit() {
    try {
        console.log("--- STARTING DATABASE AUDIT ---");

        // 1. Fetch all tests and map their answer counts
        const testsSnap = await db.collection('tests').get();
        const testAnswers = {};
        testsSnap.forEach(doc => {
            const data = doc.data();
            const qs = data.questions || [];
            const answered = qs.filter(q => q.correctOption || q.correctOptions || q.integerAnswer).length;
            testAnswers[doc.id] = { title: data.title, total: qs.length, answered };
        });

        console.log(`Found ${testsSnap.size} tests.`);

        // 2. Fetch recent results
        const resultsSnap = await db.collection('results').orderBy('submittedAt', 'desc').limit(20).get();
        console.log(`\n--- RECENT 20 RESULTS ---`);
        resultsSnap.forEach(doc => {
            const res = doc.data();
            const tid = typeof res.testId === 'string' ? res.testId : res.testId?._id;
            const info = testAnswers[tid] || { title: 'UNKNOWN', total: 0, answered: 0 };

            const firstAtt = res.attempt_data?.[0] || {};
            const resHasAns = !!(firstAtt.correctAnswer || firstAtt.correctOptions);

            console.log(`Result: ${doc.id} | Score: ${res.score} | Test: ${tid} ("${info.title}")`);
            console.log(`   -> Test state: ${info.answered}/${info.total} Qs have answers in Test DB`);
            console.log(`   -> Result record: ${resHasAns ? 'HAS' : 'MISSING'} correct answers stored in result`);
        });

    } catch (err) {
        console.error(err);
    }
}

audit().then(() => process.exit(0));
