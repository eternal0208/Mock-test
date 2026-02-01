const { db } = require('../config/firebaseAdmin');

const seedJeeMock = async () => {
    try {
        console.log('Seeding Firestore...');

        // Gen Random ID
        const genId = () => Math.random().toString(36).substr(2, 9);

        // Physics Questions
        const physicsQuestions = [
            {
                _id: genId(),
                text: "A particle is projected with velocity u at angle θ. The range is R. If the angle is made (90-θ), the range will be:",
                options: ["R", "2R", "R/2", "4R"],
                correctOption: "R",
                marks: 4,
                negativeMarks: 1,
                subject: "Physics",
                topic: "Kinematics"
            },
            {
                _id: genId(),
                text: "The dimension of Planck's constant is same as that of:",
                options: ["Force", "Energy", "Angular Momentum", "Linear Momentum"],
                correctOption: "Angular Momentum",
                marks: 4,
                negativeMarks: 1,
                subject: "Physics",
                topic: "Units and Dimensions"
            },
            {
                _id: genId(),
                text: "Two resistors of 6Ω and 3Ω are connected in parallel. Equivalent resistance is:",
                options: ["9Ω", "2Ω", "3Ω", "4.5Ω"],
                correctOption: "2Ω",
                marks: 4,
                negativeMarks: 1,
                subject: "Physics",
                topic: "Current Electricity"
            }
        ];

        // Chemistry Questions
        const chemistryQuestions = [
            {
                _id: genId(),
                text: "Which of the following is paramagnetic?",
                options: ["N2", "O2", "He", "H2"],
                correctOption: "O2",
                marks: 4,
                negativeMarks: 1,
                subject: "Chemistry",
                topic: "Chemical Bonding"
            },
            {
                _id: genId(),
                text: "The pH of 0.001 M HCl solution is:",
                options: ["1", "3", "2", "4"],
                correctOption: "3",
                marks: 4,
                negativeMarks: 1,
                subject: "Chemistry",
                topic: "Ionic Equilibrium"
            },
            {
                _id: genId(),
                text: "Which gas is evolved when Zn reacts with dilute H2SO4?",
                options: ["O2", "H2", "SO2", "Cl2"],
                correctOption: "H2",
                marks: 4,
                negativeMarks: 1,
                subject: "Chemistry",
                topic: "Redox Reactions"
            }
        ];

        // Maths Questions
        const mathsQuestions = [
            {
                _id: genId(),
                text: "The derivative of sin(x) with respect to x is:",
                options: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"],
                correctOption: "cos(x)",
                marks: 4,
                negativeMarks: 1,
                subject: "Maths",
                topic: "Calculus"
            },
            {
                _id: genId(),
                text: "If A = {1, 2, 3}, then number of subsets of A is:",
                options: ["3", "6", "8", "9"],
                correctOption: "8",
                marks: 4,
                negativeMarks: 1,
                subject: "Maths",
                topic: "Sets"
            },
            {
                _id: genId(),
                text: "Value of log(10) 100 is:",
                options: ["10", "2", "100", "0"],
                correctOption: "2",
                marks: 4,
                negativeMarks: 1,
                subject: "Maths",
                topic: "Logarithms"
            }
        ];

        const allQuestions = [...physicsQuestions, ...chemistryQuestions, ...mathsQuestions];

        const jeeMock = {
            title: "JEE Main Full Mock Test 01",
            duration_minutes: 180,
            total_marks: allQuestions.reduce((acc, q) => acc + q.marks, 0),
            subject: "Full Mock",
            difficulty: "medium",
            questions: allQuestions,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('tests').add(jeeMock);
        console.log('JEE Mock Test Seeded Successfully with ID:', docRef.id);

        // No explicit disconnect needed for Admin SDK script usually, but verify process exit
    } catch (error) {
        console.error('Error seeding test:', error);
        process.exit(1);
    }
};

seedJeeMock();
