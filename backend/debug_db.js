const { db } = require('./config/firebaseAdmin');

async function check() {
    const code = 'SCALER';
    
    const tests = await db.collection('tests').where('instituteCode', '==', code).get();
    console.log(`Found ${tests.size} tests for ${code}`);
    tests.forEach(doc => console.log('Test:', doc.id, doc.data().title, doc.data().category, doc.data().isVisible));

    const series = await db.collection('testSeries').where('instituteCode', '==', code).get();
    console.log(`Found ${series.size} series for ${code}`);
    series.forEach(doc => console.log('Series:', doc.id, doc.data().title, doc.data().isActive));

    const notes = await db.collection('notes').where('instituteCode', '==', code).get();
    console.log(`Found ${notes.size} notes for ${code}`);
    notes.forEach(doc => console.log('Note:', doc.id, doc.data().title, doc.data().field));
    
    const users = await db.collection('users').where('instituteCode', '==', code).get();
    console.log(`Found ${users.size} users for ${code}`);
    users.forEach(doc => console.log('User:', doc.id, doc.data().name, doc.data().role, doc.data().category));
}
check();
