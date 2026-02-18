const { db } = require('../config/firebaseAdmin');

// @desc    Create a new test
// @route   POST /api/tests
// @access  Admin
exports.createTest = async (req, res) => {
    try {
        const { title, duration, totalMarks, subject, category, difficulty, instructions, startTime, endTime, questions, isVisible, maxAttempts, resultVisibility, resultDeclarationTime } = req.body;

        // 1. Create Test Document (Header) - OMIT questions array to save space
        const newTestHeader = {
            title,
            duration_minutes: Number(duration),
            total_marks: Number(totalMarks),
            subject,
            category: category || 'JEE Main',
            difficulty,
            isVisible: isVisible !== undefined ? isVisible : true,
            instructions,
            startTime: startTime || null,
            endTime: endTime || null,
            maxAttempts: maxAttempts !== undefined ? Number(maxAttempts) : null,
            expiryDate: req.body.expiryDate || null,
            resultVisibility: resultVisibility || 'immediate',
            resultDeclarationTime: resultDeclarationTime || null,
            createdBy: req.user?._id || 'admin',
            createdAt: new Date().toISOString(),
            questionCount: (questions || []).length // Store count for quick display
        };

        const docRef = await db.collection('tests').add(newTestHeader);
        const testId = docRef.id;

        // 2. Upload Questions to Sub-collection
        if (questions && questions.length > 0) {
            const batch = db.batch();
            questions.forEach((q, index) => {
                // Create a reference in the sub-collection
                const qRef = db.collection('tests').doc(testId).collection('questions').doc(); // Auto-ID
                batch.set(qRef, {
                    ...q,
                    order: index, // Maintain order
                    _id: qRef.id, // Ensure internal ID matches doc ID
                    solution: q.solution || '',
                    solutionImage: q.solutionImage || ''
                });
            });
            await batch.commit();
        }

        // Link to Series (Optional)
        if (req.body.seriesId) {
            try {
                const seriesRef = db.collection('testSeries').doc(req.body.seriesId);
                const seriesDoc = await seriesRef.get();
                if (seriesDoc.exists) {
                    const currentTestIds = seriesDoc.data().testIds || [];
                    await seriesRef.update({
                        testIds: [...currentTestIds, testId]
                    });
                }
            } catch (err) {
                console.error("Failed to link test to series:", err);
            }
        }

        res.status(201).json({ _id: testId, ...newTestHeader });
    } catch (error) {
        console.error("Create Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add questions to a test
// @route   POST /api/tests/:id/questions
// @access  Admin
exports.addQuestions = async (req, res) => {
    try {
        const { questions } = req.body;
        const testId = req.params.id;
        const testRef = db.collection('tests').doc(testId);
        const doc = await testRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Test not found' });

        // Get current question count to handle ordering
        const currentQsSnapshot = await testRef.collection('questions').get();
        let currentCount = currentQsSnapshot.size;

        if (questions && questions.length > 0) {
            const batch = db.batch();
            questions.forEach((q, index) => {
                const qRef = testRef.collection('questions').doc();
                batch.set(qRef, {
                    ...q,
                    order: currentCount + index,
                    _id: qRef.id
                });
            });
            await batch.commit();

            // Update main doc count
            await testRef.update({ questionCount: currentCount + questions.length });
        }

        res.status(200).json({ message: 'Questions added successfully' });
    } catch (error) {
        console.error("Add Questions Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a Test
// @route   DELETE /api/tests/:id
// @access  Admin
exports.deleteTest = async (req, res) => {
    try {
        const testId = req.params.id;

        // 1. Delete Sub-collection Questions (Must be done manually in Firestore)
        const qsSnapshot = await db.collection('tests').doc(testId).collection('questions').get();

        // Firestore batch delete limit is 500. Assuming < 500 for now or simple loop.
        const batch = db.batch();
        qsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // 2. Delete Test Document
        await db.collection('tests').doc(testId).delete();

        res.status(200).json({ message: 'Test deleted successfully' });
    } catch (error) {
        console.error("Delete Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Student/Admin
exports.getAllTests = async (req, res) => {
    try {
        // console.log("🔍 [API] GET /api/tests called");
        const snapshot = await db.collection('tests').get();
        // console.log(`🔍 [DEBUG] Tests found in DB: ${snapshot.size}`);

        const tests = [];
        const isAdmin = req.user && req.user.role === 'admin';
        let userCategory = req.user?.category;

        // Fallback: Fetch user category
        if (!isAdmin && !userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam || uData.interest;
                }
            } catch (e) { }
        }

        snapshot.forEach(doc => {
            const data = doc.data();

            // Handle Legacy Data: If 'questions' array exists in doc, use length. If not, use 'questionCount'.
            const qCount = data.questions ? data.questions.length : (data.questionCount || 0);

            if (isAdmin) {
                tests.push({
                    _id: doc.id,
                    ...data,
                    questions: undefined, // Don't send heavy data in list view
                    questionCount: qCount
                });
                return;
            }

            // Student Filters
            const testCategory = data.category;
            if (!userCategory || !testCategory || userCategory.toLowerCase() !== testCategory.toLowerCase()) return;
            if (data.isVisible === false) return;

            tests.push({
                _id: doc.id,
                ...data,
                questions: undefined,
                questionCount: qCount
            });
        });

        res.status(200).json(tests);
    } catch (error) {
        console.error("❌ [API ERROR] getAllTests:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single test (Start Exam)
// @route   GET /api/tests/:id
// @access  Student/Admin
exports.getTestById = async (req, res) => {
    try {
        const testId = req.params.id;
        const doc = await db.collection('tests').doc(testId).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const data = doc.data();

        // FETCH QUESTIONS: Check sub-collection first, fallback to legacy array
        let questions = [];
        const qsSnapshot = await db.collection('tests').doc(testId).collection('questions').orderBy('order').get();

        if (!qsSnapshot.empty) {
            questions = qsSnapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
        } else if (data.questions && Array.isArray(data.questions)) {
            // Legacy Fallback
            questions = data.questions;
        }

        // Security & Permissions
        const isAdmin = req.user && req.user.role === 'admin';
        let userCategory = req.user?.category;

        if (!isAdmin && !userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam;
                }
            } catch (e) { }
        }

        // Student Checks
        if (!isAdmin) {
            const testCategory = data.category;
            const categoryMatch = userCategory && userCategory === testCategory;
            const isVisible = data.isVisible !== false;

            // Check if attempted
            let hasAttempted = false;
            const userId = req.user?.uid;
            if (userId) {
                try {
                    const resultCheck = await db.collection('results')
                        .where('testId', '==', testId)
                        .where('userId', '==', userId)
                        .limit(1)
                        .get();
                    hasAttempted = !resultCheck.empty;
                } catch (e) { }
            }

            if (!hasAttempted) {
                if (!categoryMatch) return res.status(403).json({ message: 'Access Denied: Category mismatch.' });
                if (!isVisible) return res.status(403).json({ message: 'Test is not currently available.' });
            }

            // Sanitization
            if (!hasAttempted) {
                questions = questions.map(q => ({
                    ...q,
                    correctOption: undefined,
                    correctOptions: undefined,
                    integerAnswer: undefined
                }));
            }
        }

        res.status(200).json({ _id: doc.id, ...data, questions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Test & Calculate Score
// @route   POST /api/tests/:id/submit
// @access  Student
exports.submitTest = async (req, res) => {
    try {
        const { userId, answers } = req.body;
        const testId = req.params.id;
        const testRef = db.collection('tests').doc(testId);
        const testDoc = await testRef.get();

        if (!testDoc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const test = testDoc.data();
        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        const attemptData = [];

        // FETCH QUESTIONS for Validation (Sub-collection or Legacy)
        let dbQuestions = [];
        const qsSnapshot = await testRef.collection('questions').orderBy('order').get();

        if (!qsSnapshot.empty) {
            dbQuestions = qsSnapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
        } else if (test.questions && Array.isArray(test.questions)) {
            dbQuestions = test.questions.map((q, i) => ({
                ...q,
                _id: q._id || `q_${testId}_${i}` // Fallback ID
            }));
        }

        const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

        answers.forEach(ans => {
            let question = questionMap.get(ans.questionId);

            // Logic to find question if ID mismatch (Legacy index based)
            if (!question && ans.questionId && ans.questionId.startsWith(`q_${testId}_`)) {
                const idx = parseInt(ans.questionId.split('_').pop());
                if (!isNaN(idx)) question = dbQuestions[idx];
            }

            if (question) {
                let isCorrect = false;
                if (question.type === 'msq') {
                    const userAns = Array.isArray(ans.selectedOption) ? ans.selectedOption : [ans.selectedOption];
                    const correctAns = question.correctOptions || [];
                    const sortedUser = [...userAns].sort();
                    const sortedCorrect = [...correctAns].sort();
                    if (sortedUser.length === sortedCorrect.length &&
                        sortedUser.every((val, index) => val === sortedCorrect[index])) {
                        isCorrect = true;
                    }
                } else if (question.type === 'integer') {
                    if (String(ans.selectedOption).trim() === String(question.integerAnswer).trim()) {
                        isCorrect = true;
                    }
                } else {
                    isCorrect = question.correctOption === ans.selectedOption;
                }

                if (isCorrect) {
                    score += Number(question.marks);
                    correctCount++;
                } else if (ans.selectedOption && (Array.isArray(ans.selectedOption) ? ans.selectedOption.length > 0 : true)) {
                    score -= Number(question.negativeMarks);
                    wrongCount++;
                }

                attemptData.push({
                    questionId: ans.questionId,
                    questionText: question.text,
                    subject: question.subject,
                    topic: question.topic,
                    selectedOption: ans.selectedOption,
                    isCorrect,
                    markedAt: new Date().toISOString()
                });
            }
        });

        const totalQuestions = dbQuestions.length;
        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        const newResult = {
            userId,
            testId: testId,
            testDetails: {
                _id: testId,
                title: test.title,
                subject: test.subject,
                total_marks: test.total_marks
            },
            score,
            accuracy,
            totalQuestions,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            attempt_data: attemptData,
            time_taken: req.body.timeTaken || 0,
            feedback: req.body.feedback || null,
            submittedAt: new Date().toISOString()
        };

        const resRef = await db.collection('results').add(newResult);

        res.status(200).json({ _id: resRef.id, ...newResult });

    } catch (error) {
        console.error("Submit Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Analytics for a Test (Rank List, Stats)
// @route   GET /api/tests/:id/analytics
// @access  Authenticated
exports.getTestAnalytics = async (req, res) => {
    try {
        const testId = req.params.id;

        // 1. Get all results for this test
        const resultsSnapshot = await db.collection('results').where('testId', '==', testId).get();
        if (resultsSnapshot.empty) {
            return res.status(200).json({
                avgScore: 0,
                totalAttempts: 0,
                rankList: [],
                feedbacks: []
            });
        }

        let totalScore = 0;
        let results = [];
        let feedbacks = [];

        // 2. Process results
        for (const doc of resultsSnapshot.docs) {
            const data = doc.data();
            totalScore += Number(data.score) || 0;

            if (data.feedback) {
                if (typeof data.feedback === 'object') {
                    feedbacks.push(data.feedback);
                } else {
                    feedbacks.push({ rating: 0, comment: data.feedback });
                }
            }

            results.push({
                userId: data.userId,
                score: Number(data.score),
                accuracy: data.accuracy || 0,
                correctAnswers: data.correctAnswers || 0,
                wrongAnswers: data.wrongAnswers || 0,
                timeTaken: data.time_taken,
                submittedAt: data.submittedAt
            });
        }

        // 3. Calculate Stats
        const totalAttempts = results.length;
        const avgScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

        // 4. Rank Generation (Sort by Score DESC, then Time ASC)
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeTaken - b.timeTaken;
        });

        // 5. Enhance with Names
        const enrichedRankList = await Promise.all(results.map(async (r, idx) => {
            let name = 'Student';
            // Only fetch names if Admin or if it's the current user (optimization)
            // Actually, we need names for the Admin view.
            if (req.user?.role === 'admin' || r.userId === req.user?.uid) {
                try {
                    const userDoc = await db.collection('users').doc(r.userId).get();
                    if (userDoc.exists) name = userDoc.data().name;
                } catch (e) { }
            }

            return {
                rank: idx + 1,
                name,
                score: r.score,
                accuracy: r.accuracy,
                correctAnswers: r.correctAnswers,
                wrongAnswers: r.wrongAnswers,
                timeTaken: r.timeTaken,
                submittedAt: r.submittedAt,
                userId: r.userId
            };
        }));

        // SECURITY FILTER:
        // If Admin: Send full list.
        // If Student: Send ONLY their entry (Privacy).
        let finalRankList = enrichedRankList;
        if (req.user?.role !== 'admin') {
            finalRankList = enrichedRankList.filter(r => r.userId === req.user?.uid);
        }

        res.status(200).json({
            testId,
            totalAttempts,
            avgScore,
            rankList: finalRankList,
            feedbacks: req.user?.role === 'admin' ? feedbacks : [] // Hide feedback from others too
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Feedback for a Test (Post-Submission)
// @route   POST /api/tests/:id/feedback
// @access  Student
exports.submitFeedback = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const testId = req.params.id;
        const userId = req.user.uid;

        if (!rating) {
            return res.status(400).json({ message: 'Rating is required' });
        }

        // Find the most recent result for this test and user
        const resultsRef = db.collection('results');
        const snapshot = await resultsRef
            .where('testId', '==', testId)
            .where('userId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No attempt found for this test to provide feedback on.' });
        }

        const resultDoc = snapshot.docs[0];
        await resultDoc.ref.update({
            feedback: {
                rating: Number(rating),
                comment: comment || ''
            }
        });

        res.status(200).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error("Submit Feedback Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Active Test Series (Public)
// @route   GET /api/tests/series
exports.getAllSeries = async (req, res) => {
    try {
        const snapshot = await db.collection('testSeries').where('isActive', '==', true).get();

        // Strict Field Filter
        // Note: Middleware 'protect' attaches req.user
        const userField = req.user ? (req.user.category || req.user.selectedField || req.user.interest) : null;
        const isAdmin = req.user && req.user.role === 'admin';

        const series = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const seriesField = data.category || data.field;

            if (!isAdmin) {
                // If userField is present (Logged In), filter by it.
                // If userField is null (Guest), SHOW ALL (or show none? Standard is show relevant or all public).
                // Let's show ALL for guests to entice them.
                if (userField && seriesField && seriesField !== userField) return;
            }
            series.push({ id: doc.id, ...data });
        });

        res.status(200).json(series);
    } catch (error) {
        console.error("Fetch Series Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle Test Visibility
// @route   PUT /api/tests/:id/visibility
// @access  Admin
exports.toggleVisibility = async (req, res) => {
    try {
        const { isVisible } = req.body;
        await db.collection('tests').doc(req.params.id).update({ isVisible });
        res.status(200).json({ message: 'Visibility updated', isVisible });
    } catch (error) {
        console.error("Toggle Visibility Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
