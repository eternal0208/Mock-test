const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function findPositiveScore() {
    try {
        const snap = await db.collection('results').where('score', '>', 0).limit(5).get();
        if (snap.empty) {
            console.log("No results found with score > 0");
            return;
        }
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`Result: ${doc.id} | Score: ${data.score} | Test: ${data.testId}`);
        });
    } catch (err) {
        console.error(err);
    }
}

findPositiveScore().then(() => process.exit(0));
