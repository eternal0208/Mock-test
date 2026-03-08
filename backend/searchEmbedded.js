const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { db } = require('./config/firebaseAdmin');

async function searchEmbeddedAnswers(testId) {
    try {
        const doc = await db.collection('tests').doc(testId).get();
        const test = doc.data();

        console.log(`--- SEARCHING EMBEDDED ANSWERS: ${test.title} ---`);
        (test.questions || []).forEach((q, i) => {
            const combinedText = (q.text || '') + ' ' + (q.solutionText || '') + ' ' + (q.solution || '');
            const match = combinedText.match(/Correct (Option|Ans|Answer):\s*([A-D])/i);
            if (match) {
                console.log(`Q${i + 1}: Found potential answer "${match[2]}" in text.`);
            }
        });

    } catch (err) {
        console.error(err);
    }
}

searchEmbeddedAnswers('gcGxtdKLCpfE5Sic5bU4').then(() => process.exit(0));
