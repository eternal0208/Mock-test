const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function dumpGoodTest() {
    try {
        const id = '05lg0KMkvpNTSDU9wGxF'; // This one had 75/75 answered
        const doc = await db.collection('tests').doc(id).get();
        const test = doc.data();

        console.log(`--- GOOD TEST DUMP: ${test.title} ---`);
        if (test.questions && test.questions.length > 0) {
            console.log("Question 0 Sample:");
            console.log(JSON.stringify({
                _id: test.questions[0]._id,
                text: test.questions[0].text?.substring(0, 20),
                correctOption: test.questions[0].correctOption,
                correctOptions: test.questions[0].correctOptions,
                ans: test.questions[0].ans,
                answer: test.questions[0].answer
            }, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
}

dumpGoodTest().then(() => process.exit(0));
