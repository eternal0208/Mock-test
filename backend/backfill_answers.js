const { db } = require('./config/firebaseAdmin');

async function backfillAnswerCount() {
    console.log('🚀 Starting Answer Count Backfill...');
    try {
        const testsSnapshot = await db.collection('tests').get();
        console.log(`Found ${testsSnapshot.size} tests.`);

        let updated = 0;
        for (const doc of testsSnapshot.docs) {
            const data = doc.data();
            const questions = data.questions || [];

            const calculatedAnswerCount = questions.filter(q =>
                q.correctOption ||
                (q.correctOptions && q.correctOptions.length > 0) ||
                (q.integerAnswer !== undefined && q.integerAnswer !== '')
            ).length;

            if (data.answerCount !== calculatedAnswerCount) {
                console.log(`Updating test "${data.title}" (${doc.id}): ${data.answerCount || 0} -> ${calculatedAnswerCount}`);
                await doc.ref.update({
                    answerCount: calculatedAnswerCount,
                    questionCount: questions.length
                });
                updated++;
            }
        }
        console.log(`✅ Backfill complete. Updated ${updated} tests.`);
    } catch (error) {
        console.error('❌ Backfill failed:', error);
    }
}

backfillAnswerCount();
