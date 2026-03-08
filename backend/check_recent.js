const { db } = require('./config/firebaseAdmin');

async function checkRecentTests() {
    // get tests sorted by updated timestamp, or just get all and filter locally if updatedAt isn't indexed
    const testsSnapshot = await db.collection('tests').get();
    let tests = [];
    testsSnapshot.forEach(doc => {
        tests.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt or some timestamp if we don't have updatedAt. Let's just find the first few tests with answerCount = 0 but questions exist
    tests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    for (const test of tests.slice(0, 5)) {
        console.log(`\nTest: ${test.title} (${test.id})`);
        console.log(`AnswerCount: ${test.answerCount}, QuestionCount: ${test.questionCount}`);

        if (test.questions && test.questions.length > 0) {
            const firstQ = test.questions[0];
            console.log(`Q0 correctOption: ${firstQ.correctOption}, options: ${JSON.stringify(firstQ.options)}, integerAnswer: ${firstQ.integerAnswer}`);
        }
    }
}
checkRecentTests();
