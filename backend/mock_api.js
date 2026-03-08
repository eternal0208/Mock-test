const { db } = require('./config/firebaseAdmin');
const testController = require('./controllers/testController');

async function mockApiRequest() {
    const req = {
        user: { role: 'admin' },
        query: {}
    };

    const res = {
        status: (code) => res, // Chainable
        json: (data) => {
            console.log("Mock API Response:");
            // Find a test with 0 DB answerCount but presumably some answers
            const samples = data.slice(0, 10).map(t => ({
                id: t._id,
                title: t.title,
                answerCount: t.answerCount,
                questionCount: t.questionCount
            }));
            console.log(samples);
        }
    };

    await testController.getAllTests(req, res);
}

mockApiRequest();
