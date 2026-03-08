const { db } = require('./config/firebaseAdmin');

async function simulateMarking() {
    console.log('🧪 Simulating marking update...');
    try {
        // 1. Find a test with 0 coverage
        const testsSnapshot = await db.collection('tests').get();
        let targetId = null;
        let targetData = null;

        for (const doc of testsSnapshot.docs) {
            const data = doc.data();
            if ((data.answerCount || 0) === 0 && (data.questions || []).length > 0) {
                targetId = doc.id;
                targetData = data;
                break;
            }
        }

        if (!targetId) {
            console.log('No broken tests found to simulate on.');
            return;
        }

        console.log(`Targeting test: "${targetData.title}" (${targetId})`);

        // 2. Simulate marking 5 questions with "A"
        const updatedQuestions = targetData.questions.map((q, i) => {
            if (i < 5) {
                return { ...q, correctOption: 'A' };
            }
            return q;
        });

        // 3. Simulate backend update logic
        const updateData = { questions: updatedQuestions };
        updateData.answerCount = updateData.questions.filter(q =>
            q.correctOption ||
            (q.correctOptions && q.correctOptions.length > 0) ||
            (q.integerAnswer !== undefined && q.integerAnswer !== '')
        ).length;

        console.log(`Calculated answerCount: ${updateData.answerCount}`);

        await db.collection('tests').doc(targetId).update(updateData);
        console.log('Update successful.');

        // 4. Verify in DB
        const verifiedDoc = await db.collection('tests').doc(targetId).get();
        const verifiedData = verifiedDoc.data();
        console.log(`Verified answerCount in DB: ${verifiedData.answerCount}`);

    } catch (error) {
        console.error('Simulation failed:', error);
    }
}

simulateMarking();
