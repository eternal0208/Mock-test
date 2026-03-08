const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function checkSubCollections(testId) {
    try {
        const docRef = db.collection('tests').doc(testId);
        const subCollections = await docRef.listCollections();
        console.log(`--- SUB-COLLECTIONS FOR TEST: ${testId} ---`);
        if (subCollections.length === 0) {
            console.log("No sub-collections found.");
            return;
        }
        for (const col of subCollections) {
            console.log(`Sub-collection found: ${col.id}`);
            const snap = await col.limit(3).get();
            snap.forEach(doc => {
                console.log(`  [${doc.id}] Data Sample:`, JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (err) {
        console.error(err);
    }
}

checkSubCollections('gcGxtdKLCpfE5Sic5bU4').then(() => process.exit(0));
