const { db } = require('./config/firebaseAdmin');

async function check() {
    const code = 'ABC1213';
    
    const tests = await db.collection('tests').where('instituteCode', '==', code).get();
    console.log(`Found ${tests.size} tests for ${code}`);
    
    const series = await db.collection('testSeries').where('instituteCode', '==', code).get();
    console.log(`Found ${series.size} series for ${code}`);
    
    const notes = await db.collection('notes').where('instituteCode', '==', code).get();
    console.log(`Found ${notes.size} notes for ${code}`);
}
check();
