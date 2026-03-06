require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('../config/firebaseAdmin');

const backfillQuestionCount = async () => {
    try {
        console.log('🔄 Starting questionCount backfill for Tests...');
        const snapshot = await db.collection('tests').get();
        let updated = 0;
        let skipped = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const actualCount = data.questions ? data.questions.length : 0;

            if (data.questionCount !== actualCount) {
                await doc.ref.update({ questionCount: actualCount });
                console.log(`✅ Updated Test: ${doc.id} | Set questionCount to: ${actualCount}`);
                updated++;
            } else {
                skipped++;
            }
        }

        console.log(`\n🎉 Backfill Complete!`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);
    } catch (error) {
        console.error('❌ Error updating Firestore:', error);
    }
    process.exit();
};

backfillQuestionCount();
