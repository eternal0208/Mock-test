const { db } = require('../config/firebaseAdmin');

const checkTests = async () => {
    try {
        console.log('🔍 Checking Firestore for Tests...');
        const snapshot = await db.collection('tests').get();

        if (snapshot.empty) {
            console.log('❌ No tests found in Firestore!');
        } else {
            console.log(`✅ Found ${snapshot.size} tests:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- ID: ${doc.id} | Title: ${data.title} | Category: ${data.category}`);
            });
        }
    } catch (error) {
        console.error('❌ Error reading Firestore:', error);
    }
    process.exit();
};

checkTests();
