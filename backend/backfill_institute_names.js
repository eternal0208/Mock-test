const { db } = require('./config/firebaseAdmin');

async function run() {
    const usersSnapshot = await db.collection('users').where('instituteCode', '!=', '').get();
    let count = 0;
    
    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        if (data.instituteCode && !data.instituteName) {
            const instQuery = await db.collection('institutes').where('instituteCode', '==', data.instituteCode).limit(1).get();
            if (!instQuery.empty) {
                const name = instQuery.docs[0].data().name;
                await db.collection('users').doc(doc.id).update({ instituteName: name });
                console.log(`Updated user ${doc.id} with instituteName: ${name}`);
                count++;
            }
        }
    }
    console.log(`Backfill complete. Updated ${count} users.`);
}
run();
