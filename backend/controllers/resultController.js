const { db } = require('../config/firebaseAdmin');

// @desc    Get User Results
// @route   GET /api/results/student/:userId
// @access  Student
exports.getStudentResults = async (req, res) => {
    try {
        const resultsRef = db.collection('results');
        const snapshot = await resultsRef.where('userId', '==', req.params.userId).get();

        const results = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Data already has denormalized testId object from submitTest
            results.push({ _id: doc.id, ...data });
        });

        // Client sorting (Firestore requires compound index for where+sort)
        results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Results (Admin)
// @route   GET /api/results/admin
// @access  Admin
exports.getAllResults = async (req, res) => {
    try {
        const snapshot = await db.collection('results').orderBy('submittedAt', 'desc').get();
        const results = [];

        // We need to fetch User details manually or rely on stored User data (not implemented yet).
        // Efficiency: Fetch all users once or just partial?
        // Let's just return IDs for now, or if we stored userName in result (we should have).
        // Since we didn't store userName in result, we might want to fetch it.
        // For MVP, just return what we have.

        snapshot.forEach(doc => {
            results.push({ _id: doc.id, ...doc.data() });
        });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Results for a Specific Test (For Ranking/Leaderboard)
// @route   GET /api/results/test/:testId
// @access  Public/Student (filtered) or Admin (full)
exports.getTestResults = async (req, res) => {
    try {
        const { testId } = req.params;
        const resultsRef = db.collection('results');
        const snapshot = await resultsRef.where('testId._id', '==', testId).get();

        const results = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // We only need score, userId, userName (if available), time_taken for ranking
            results.push({
                _id: doc.id,
                score: data.score,
                userId: data.userId,
                // userId is critical for matching "Me". 
                // In a real app, populate userName from Users collection here or store it in result.
                submittedAt: data.submittedAt
            });
        });

        // Sort by Score (Desc), then Time Taken (Asc - optional, not implementing time sort yet)
        results.sort((a, b) => b.score - a.score);

        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching test results:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
