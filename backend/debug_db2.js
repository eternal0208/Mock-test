const { db } = require('./config/firebaseAdmin');

async function check() {
    const users = await db.collection('users').where('instituteName', '!=', '').get();
    users.forEach(doc => console.log('User:', doc.id, doc.data().name, doc.data().instituteCode, doc.data().instituteName, doc.data().category));
}
check();
