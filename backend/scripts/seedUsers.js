const { db, auth } = require('../config/firebaseAdmin');

const seedUsers = async () => {
    const usersToSeed = [
        {
            uid: 'admin-seed-001', // Optional: specify UID or let Auth generate
            email: 'admin@demo.com',
            password: 'password123',
            name: 'Demo Admin',
            role: 'admin'
        },
        {
            email: 'student@demo.com',
            password: 'password123',
            name: 'Demo Student',
            role: 'student'
        },
        {
            email: 'student2@demo.com',
            password: 'password123',
            name: 'Alice Cooper',
            role: 'student'
        }
    ];

    console.log('Starting User Seeding for Firebase Auth & Firestore...');

    for (const user of usersToSeed) {
        try {
            let userRecord;

            // 1. Check or Create in Firebase Auth
            try {
                userRecord = await auth.getUserByEmail(user.email);
                console.log(`Auth: User ${user.email} already exists [${userRecord.uid}]`);
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    const createConfig = {
                        email: user.email,
                        password: user.password,
                        displayName: user.name,
                        emailVerified: true
                    };
                    if (user.uid) createConfig.uid = user.uid;

                    userRecord = await auth.createUser(createConfig);
                    console.log(`Auth: Created new user ${user.email} [${userRecord.uid}]`);
                } else {
                    throw e;
                }
            }

            // 2. Set Custom Claims (Roles)
            const isAdmin = user.role === 'admin';
            await auth.setCustomUserClaims(userRecord.uid, { admin: isAdmin, role: user.role });
            // console.log(`Auth: Claims set for ${user.email}`);

            // 3. Create/Update in Firestore
            const userDoc = {
                uid: userRecord.uid, // Redundant but useful
                firebaseUid: userRecord.uid, // Consistency with my other code
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: new Date().toISOString(),
                isSeeded: true
            };

            await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
            console.log(`Firestore: Synced profile for ${user.name} (${user.role})`);

        } catch (error) {
            console.error(`Failed to process ${user.email}:`, error.message);
        }
    }

    console.log('User Seeding Completed.');
    process.exit(0);
};

seedUsers();
