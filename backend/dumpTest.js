const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function scanRecentTests() {
    try {
        const snap = await db.collection('tests').orderBy('createdAt', 'desc').limit(10).get();
        console.log(`Scan: Last 10 Tests`);

        for (const doc of snap.docs) {
            const test = doc.data();
            const questions = test.questions || [];
            const answeredCount = questions.filter(q => q.correctOption || q.correctOptions || q.integerAnswer).length;
            console.log(`[${doc.id}] Title: ${test.title} | Qs: ${questions.length} | Answered: ${answeredCount}`);
        }

    } catch (err) {
        console.error(err);
    }
}

async function run() {
    await scanRecentTests();
    process.exit(0);
}

run();
