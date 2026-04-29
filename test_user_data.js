const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./backend/config/firebaseServiceAccount.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUsers() {
    const users = await db.collection('users').limit(5).get();
    users.forEach(doc => {
        console.log(doc.id, doc.data().name, doc.data().instituteCode, doc.data().instituteName);
    });
}
checkUsers();
