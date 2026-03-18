const { db } = require('./config/firebaseAdmin');

async function getIds() {
    try {
        const testSnap = await db.collection('tests').limit(1).get();
        let testId = null;
        testSnap.forEach(doc => testId = doc.id);

        const userSnap = await db.collection('users').limit(1).get();
        let userId = null;
        userSnap.forEach(doc => userId = doc.id);

        console.log(JSON.stringify({ testId, userId }));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getIds();
