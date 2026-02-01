const { db, auth } = require('../config/firebaseAdmin');

const makeAdmin = async () => {
    const email = process.argv[2];

    if (!email) {
        console.error('Please provide an email address. Usage: node scripts/makeAdminFire.js <email>');
        process.exit(1);
    }

    try {
        console.log(`Looking up user ${email}...`);

        // 1. Find User in Firestore to get UID (and update role)
        const userQuery = await db.collection('users').where('email', '==', email).get();

        if (userQuery.empty) {
            console.error(`User with email ${email} not found in Firestore. Ensure they have signed up.`);
            process.exit(1);
        }

        const userDoc = userQuery.docs[0];
        const uid = userDoc.id; // Or userDoc.data().firebaseUid

        // 2. Update Firestore Role
        await userDoc.ref.update({ role: 'admin' });
        console.log(`Firestore: User role updated to 'admin'.`);

        // 3. Set Custom Claims in Firebase Auth
        await auth.setCustomUserClaims(uid, { admin: true });
        console.log(`FirebaseAuth: Custom claim { admin: true } set for user ${uid}.`);

        console.log(`\nSuccess! ${email} is now an Admin.`);
        process.exit(0);

    } catch (error) {
        console.error("Error promoting user:", error);
        process.exit(1);
    }
};

makeAdmin();
