const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function sampleResults() {
    try {
        const snap = await db.collection('results').limit(10).get();
        console.log(`Total results found: ${snap.size}`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`Result: ${doc.id} | Score: ${data.score} | Test: ${data.testId}`);
        });
    } catch (err) {
        console.error(err);
    }
}

sampleResults().then(() => process.exit(0));
