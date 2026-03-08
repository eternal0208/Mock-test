const fetch = require('node-fetch'); // Needs to run in an environment or using http module. Or better, use a local script with the DB directly.

// Wait, getting it from the DB directly using the actual controller logic:
const { db } = require('./config/firebaseAdmin');

async function testGetAllTestsDummy() {
    const testsSnapshot = await db.collection('tests').get();
    const tests = [];
    testsSnapshot.forEach(doc => {
        const data = doc.data();
        tests.push({
            title: data.title,
            answerCountRaw: data.answerCount,
            questionCountRaw: data.questionCount,
            questionsLen: (data.questions || []).length,
            calcAnsCount: (data.questions || []).filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length
        });
    });
    console.log(tests.slice(0, 10)); // Just a sample
}
testGetAllTestsDummy();
