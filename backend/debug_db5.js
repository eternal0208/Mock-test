const { db } = require('./config/firebaseAdmin');

async function check() {
    const tests = await db.collection('tests').where('instituteCode', '!=', '').get();
    console.log(`Found ${tests.size} tests with an institute code`);
    tests.forEach(doc => console.log('Test:', doc.id, doc.data().instituteCode));

    const series = await db.collection('testSeries').where('instituteCode', '!=', '').get();
    console.log(`Found ${series.size} series with an institute code`);
    series.forEach(doc => console.log('Series:', doc.id, doc.data().instituteCode));

    const notes = await db.collection('notesSections').where('instituteCode', '!=', '').get();
    console.log(`Found ${notes.size} notesSections with an institute code`);
    notes.forEach(doc => console.log('Section:', doc.id, doc.data().instituteCode));
    
    const notes2 = await db.collection('notes').where('instituteCode', '!=', '').get();
    console.log(`Found ${notes2.size} notes with an institute code`);
    notes2.forEach(doc => console.log('Note:', doc.id, doc.data().instituteCode));
}
check();
