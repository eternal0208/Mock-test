const { db } = require('./config/firebaseAdmin');

async function inspectTests() {
    console.log('🔍 Inspecting tests with 0 coverage...');
    try {
        const testsSnapshot = await db.collection('tests').get();
        for (const doc of testsSnapshot.docs) {
            const data = doc.data();
            const questions = data.questions || [];

            const ansCount = data.answerCount || 0;
            const qCount = data.questionCount || questions.length;

            if (ansCount === 0 && qCount > 0) {
                console.log(`\n--- Test: "${data.title}" (${doc.id}) ---`);
                console.log(`Q Count: ${qCount}, Ans Count: ${ansCount}`);
                if (questions.length > 0) {
                    console.log('Sample Question fields:', Object.keys(questions[0]));
                    console.log('Sample Question data:', JSON.stringify(questions[0], null, 2));
                }
                // Only inspect first few broken ones
            }
        }
    } catch (error) {
        console.error('Inspection failed:', error);
    }
}

inspectTests();
