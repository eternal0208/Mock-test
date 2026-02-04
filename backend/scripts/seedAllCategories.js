const { db } = require('../config/firebaseAdmin');

const seedAllCategories = async () => {
    try {
        console.log('🌱 Seeding Tests for All Categories...');

        // Gen Random ID
        const genId = () => Math.random().toString(36).substr(2, 9);
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + 30); // Valid for 30 days

        const questions = [
            {
                _id: genId(),
                text: "Sample Question 1: What is 2 + 2?",
                options: ["3", "4", "5", "6"],
                correctOption: "4",
                marks: 4,
                negativeMarks: 1,
                subject: "General",
                topic: "Basic Math"
            },
            {
                _id: genId(),
                text: "Sample Question 2: What is the capital of India?",
                options: ["Mumbai", "Delhi", "Kolkata", "Chennai"],
                correctOption: "Delhi",
                marks: 4,
                negativeMarks: 1,
                subject: "General",
                topic: "GK"
            }
        ];

        const categories = [
            { name: 'JEE Main', subject: 'PCM' },
            { name: 'JEE Advanced', subject: 'PCM' },
            { name: 'NEET', subject: 'PCB' },
            { name: 'CAT', subject: 'Aptitude' },
            { name: 'Board Exam', subject: 'All Subjects' },
            { name: 'Others', subject: 'General' }
        ];

        for (const cat of categories) {
            const testData = {
                title: `${cat.name} Mock Test 01`,
                category: cat.name,
                duration_minutes: 60,
                total_marks: 8,
                subject: cat.subject,
                difficulty: "medium",
                questions: questions,
                isVisible: true,
                status: 'live',
                accessType: 'free',
                startTime: now.toISOString(),
                endTime: future.toISOString(),
                createdAt: now.toISOString()
            };

            const docRef = await db.collection('tests').add(testData);
            console.log(`✅ Seeded ${cat.name} Test (ID: ${docRef.id})`);
        }

        console.log('🎉 All categories seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding tests:', error);
        process.exit(1);
    }
};

seedAllCategories();
