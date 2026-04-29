const { db } = require('./config/firebaseAdmin');

async function checkUsers() {
    const users = await db.collection('users').limit(5).get();
    users.forEach(doc => {
        console.log(doc.id, doc.data().name, doc.data().instituteCode, doc.data().instituteName);
    });
}
checkUsers();
