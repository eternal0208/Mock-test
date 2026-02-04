const { db } = require('../config/firebaseAdmin');

const listUsers = async () => {
    try {
        console.log('🔍 Listing Users to check Roles & Categories...');
        const snapshot = await db.collection('users').get();

        if (snapshot.empty) {
            console.log('❌ No users found!');
        } else {
            console.log(`✅ Found ${snapshot.size} users:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- Name: ${data.name} | Role: ${data.role} | Category: ${data.category || 'N/A'} | Email: ${data.email}`);
            });
        }
    } catch (error) {
        console.error('❌ Error reading Firestore:', error);
    }
    process.exit();
};

listUsers();
