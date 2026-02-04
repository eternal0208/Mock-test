const { db } = require('../config/firebaseAdmin');

async function debugTests() {
    try {
        console.log("🔍 [DEBUG SCRIPT] Fetching all tests from Firestore...");
        const snapshot = await db.collection('tests').get();
        console.log(`✅ Found ${snapshot.size} tests in 'tests' collection.`);

        if (snapshot.empty) {
            console.log("⚠️ Collection is empty.");
            return;
        }

        const tests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n📄 Test ID: ${doc.id}`);
            console.log(`   Title: ${data.title}`);
            console.log(`   Category: '${data.category}'`);
            console.log(`   IsVisible: ${data.isVisible}`);
            console.log(`   Subject: ${data.subject}`);

            // Simulation
            const userCategory = 'JEE Main'; // Example
            console.log(`   👉 Matching against User Category '${userCategory}':`);

            if (!data.category || !userCategory || data.category.toLowerCase() !== userCategory.toLowerCase()) {
                console.log(`      ❌ Mismatch: '${data.category}' vs '${userCategory}'`);
            } else {
                console.log(`      ✅ MATCH!`);
            }
        });

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

debugTests();
