const { db } = require('../config/firebaseAdmin');

const normalizeUsers = async () => {
    try {
        console.log('🔄 Starting User Normalization...');
        const snapshot = await db.collection('users').get();

        let updatedCount = 0;
        const batch = db.batch();

        snapshot.forEach(doc => {
            const data = doc.data();
            const ref = db.collection('users').doc(doc.id);

            // Determine the correct category from legacy fields
            const category = data.category || data.targetExam || data.selectedField || data.interest || '';

            if (category) {
                // Update with unified 'category' field
                batch.update(ref, {
                    category: category,
                    // Optional: keep legacy fields for safety or remove them?
                    // Let's keep them but ensure 'category' is the source of truth
                });
                updatedCount++;
            }
        });

        await batch.commit();
        console.log(`✅ Normalized ${updatedCount} users to use 'category' field.`);
    } catch (error) {
        console.error('❌ Error normalizing users:', error);
    }
    process.exit();
};

normalizeUsers();
