const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function backfillAnswerCount() {
    try {
        const testsSnap = await db.collection('tests').get();
        console.log(`Processing ${testsSnap.size} tests...`);

        let updated = 0;
        for (const doc of testsSnap.docs) {
            const data = doc.data();
            const questions = data.questions || [];
            const ansCount = questions.filter(q =>
                q.correctOption ||
                (q.correctOptions && q.correctOptions.length > 0) ||
                (q.integerAnswer !== undefined && q.integerAnswer !== '')
            ).length;

            await doc.ref.update({
                answerCount: ansCount,
                questionCount: questions.length
            });
            updated++;
            console.log(`[${updated}/${testsSnap.size}] Updated: ${data.title} -> ${ansCount}/${questions.length}`);
        }
        console.log("Backfill complete!");
    } catch (err) {
        console.error(err);
    }
}

backfillAnswerCount().then(() => process.exit(0));
