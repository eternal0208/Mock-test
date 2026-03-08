const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function checkGoodResults() {
    try {
        const testId = '05lg0KMkvpNTSDU9wGxF'; // The good one
        const snap = await db.collection('results').where('testId', '==', testId).limit(5).get();

        console.log(`--- RESULTS FOR GOOD TEST: ${testId} ---`);
        if (snap.empty) {
            console.log("No results found for this test yet.");
            // Try with object format
            const snap2 = await db.collection('results').where('testId._id', '==', testId).limit(5).get();
            if (snap2.empty) {
                console.log("No results found with object format either.");
                return;
            }
            snap2.forEach(doc => console.log(`Result: ${doc.id} | Score: ${doc.data().score}`));
        } else {
            snap.forEach(doc => console.log(`Result: ${doc.id} | Score: ${doc.data().score}`));
        }
    } catch (err) {
        console.error(err);
    }
}

checkGoodResults().then(() => process.exit(0));
