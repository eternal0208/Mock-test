const { db } = require('./config/firebaseAdmin');

async function check() {
    const doc = await db.collection('notesSections').doc('OgjZnhOs6qkrKA615CwJ').get();
    console.log(doc.data());
}
check();
