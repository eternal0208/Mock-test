const { db } = require('../config/firebaseAdmin');

async function checkLatestResult() {
    try {
        console.log("🔍 Finding latest result...");
        const snapshot = await db.collection('results')
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log("❌ No results found in DB.");
            return;
        }

        const resultDoc = snapshot.docs[0];
        const result = resultDoc.data();
        console.log(`✅ Latest Result ID: ${resultDoc.id}`);
        console.log(`   User ID: ${result.userId}`);

        let testIdRaw = result.testId;
        console.log(`   Stored testId (Raw):`, testIdRaw);

        const testId = (typeof testIdRaw === 'object' && testIdRaw._id) ? testIdRaw._id : testIdRaw;
        console.log(`   Target Test ID: ${testId}`);

        if (!testId) {
            console.error("❌ Link Broken: testId is null/undefined in result.");
            return;
        }

        const testDoc = await db.collection('tests').doc(testId).get();
        if (testDoc.exists) {
            console.log(`✅ Test Found: ${testDoc.data().title}`);
            console.log(`   Detailed Test ID: ${testDoc.id}`);
        } else {
            console.error(`❌ Test NOT FOUND. The document with ID '${testId}' does not exist in 'tests' collection.`);
            console.log("   POSSIBLE CAUSE: Test was deleted but Result remains.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

checkLatestResult();
