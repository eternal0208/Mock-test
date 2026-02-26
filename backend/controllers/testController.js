const { db } = require('../config/firebaseAdmin');

// @desc    Create a new test
// @route   POST /api/tests
// @access  Admin
exports.createTest = async (req, res) => {
    try {
        const { title, duration, totalMarks, subject, category, difficulty, instructions, startTime, endTime, questions, isVisible, maxAttempts, resultVisibility, resultDeclarationTime } = req.body;

        const newTest = {
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
            // Result visibility settings
            resultVisibility: resultVisibility || 'immediate', // 'immediate' | 'scheduled' | 'afterTestEnds'
            resultDeclarationTime: resultDeclarationTime || null, // ISO date string for scheduled mode
            questions: (questions || []).map((q, i) => ({
                ...q,
                _id: q._id || `q_${Date.now()}_${i}`,
                // Ensure solution fields are preserved
                solution: q.solution || '',
                solutionImage: q.solutionImage || ''
            })),
            createdBy: req.user?._id || 'admin',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('tests').add(newTest);

        // Link to Series if seriesId provided
        if (req.body.seriesId) {
            try {
                const seriesRef = db.collection('testSeries').doc(req.body.seriesId);
                const seriesDoc = await seriesRef.get();
                if (seriesDoc.exists) {
                    const currentTestIds = seriesDoc.data().testIds || [];
                    await seriesRef.update({
                        testIds: [...currentTestIds, docRef.id]
                    });
                }
            } catch (err) {
                console.error("Failed to link test to series:", err);
                // Non-critical error, continue
            }
        }

        res.status(201).json({ _id: docRef.id, ...newTest });
    } catch (error) {
        console.error("Create Test Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add questions to a test (Legacy/Optional)
// @route   POST /api/tests/:id/questions
// @access  Admin
exports.addQuestions = async (req, res) => {
    try {
        const { questions } = req.body;
        const testRef = db.collection('tests').doc(req.params.id);
        const doc = await testRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Test not found' });

        const currentQuestions = doc.data().questions || [];
        const updatedQuestions = [...currentQuestions, ...questions];

        await testRef.update({ questions: updatedQuestions });

        res.status(200).json({ _id: doc.id, ...doc.data(), questions: updatedQuestions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a Test
// @route   DELETE /api/tests/:id
// @access  Admin
exports.deleteTest = async (req, res) => {
    try {
        await db.collection('tests').doc(req.params.id).delete();
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
        console.log("🔍 [API] GET /api/tests called");
        const snapshot = await db.collection('tests').get();
        console.log(`🔍 [DEBUG] Tests found in DB: ${snapshot.size}`);

        const tests = [];
        const isAdmin = req.user && req.user.role === 'admin';
        let userCategory = req.user?.category;

        // Fallback: Fetch user category from DB if not in token and not admin
        if (!isAdmin && !userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam || uData.interest;
                }
            } catch (e) {
                console.error("Error fetching user category fallback:", e);
            }
        }

        console.log("🔍 [DEBUG] Requester:", {
            uid: req.user?.uid,
            role: req.user?.role,
            category: userCategory
        });

        snapshot.forEach(doc => {
            const data = doc.data();
            const testId = doc.id;

            // ADMIN: Show all tests regardless of category or visibility
            if (isAdmin) {
                tests.push({
                    _id: doc.id,
                    title: data.title,
                    duration_minutes: data.duration_minutes,
                    total_marks: data.total_marks,
                    subject: data.subject,
                    category: data.category || 'JEE Main',
                    difficulty: data.difficulty,
                    isVisible: data.isVisible !== undefined ? data.isVisible : true,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    expiryDate: data.expiryDate || null,
                    maxAttempts: data.maxAttempts,
                    questionCount: data.questions?.length || 0
                });
                return;
            }

            // STUDENT: Apply strict filters
            const testCategory = data.category;

            // Debug check for specific tests if needed
            // console.log(`🔍 Checking Test ${data.title}: UserCat=${userCategory}, TestCat=${testCategory}, Visible=${data.isVisible}`);

            // Filter 1: Category must match (Case Insensitive)
            if (!userCategory || !testCategory || userCategory.toLowerCase() !== testCategory.toLowerCase()) {
                // console.log(`❌ Skipping Test ${data.title}: Category Mismatch (${userCategory} vs ${testCategory})`);
                return;
            }

            // Filter 2: Only show visible tests
            if (data.isVisible === false) {
                // console.log(`❌ Skipping Test ${data.title}: Not Visible`);
                return;
            }

            tests.push({
                _id: doc.id,
                title: data.title,
                duration_minutes: data.duration_minutes,
                total_marks: data.total_marks,
                subject: data.subject,
                category: data.category || 'JEE Main',
                difficulty: data.difficulty,
                isVisible: data.isVisible !== undefined ? data.isVisible : true,
                startTime: data.startTime,
                endTime: data.endTime,
                expiryDate: data.expiryDate || null,
                maxAttempts: data.maxAttempts,
                questionCount: data.questions?.length || 0
            });
        });

        console.log(`✅ [DEBUG] Returning ${tests.length} tests to client`);
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
        const doc = await db.collection('tests').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const data = doc.data();

        // Security: Check permissions
        const isAdmin = req.user && req.user.role === 'admin';

        // ADMIN: Can access any test
        if (isAdmin) {
            const sanitizedQuestions = (data.questions || []).map(q => ({
                ...q,
                _id: q._id || Math.random().toString(36).substr(2, 9),
                correctOption: undefined,
                correctOptions: undefined,
                integerAnswer: undefined
            }));
            return res.status(200).json({ _id: doc.id, ...data, questions: sanitizedQuestions });
        }

        // STUDENT: Check category and visibility
        let userCategory = req.user?.category;
        if (!userCategory && req.user?.uid) {
            try {
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    userCategory = uData.category || uData.selectedField || uData.targetExam;
                }
            } catch (e) { }
        }

        const testCategory = data.category;

        // Filter 1: Category must match
        // STRICT CHECK: Matches exactly.
        const categoryMatch = userCategory && userCategory === testCategory;

        // Filter 2: Test must be visible
        const isVisible = data.isVisible !== false;

        // AUTH CHECK:
        // A user can access the test if:
        // 1. (Standard) Category Matches AND Test is Visible (Start Exam flow)
        // 2. (Result Review) User has already ATTEMPTED the test (Result exists) -> Bypass restrictions so they can view solutions.

        let hasAttempted = false;
        const userId = req.user?.uid;

        if (userId) {
            try {
                const resultCheck = await db.collection('results')
                    .where('testId', '==', req.params.id)
                    .where('userId', '==', userId)
                    .limit(1)
                    .get();
                hasAttempted = !resultCheck.empty;
            } catch (e) { console.error("Error checking attempt", e); }
        }

        if (!hasAttempted) {
            if (!categoryMatch) return res.status(403).json({ message: 'Access Denied: Category mismatch.' });
            if (!isVisible) return res.status(403).json({ message: 'Test is not currently available.' });

            // FRAUD PROTECTION: Check if test belongs to a PAID series
            // If yes, user MUST have a valid purchase record
            if (userId) {
                try {
                    // Find any series containing this test
                    const seriesSnapshot = await db.collection('testSeries')
                        .where('testIds', 'array-contains', req.params.id)
                        .limit(1)
                        .get();

                    if (!seriesSnapshot.empty) {
                        const seriesDoc = seriesSnapshot.docs[0];
                        const seriesData = seriesDoc.data();

                        // If series is PAID, verify purchase
                        if (seriesData.price > 0 && seriesData.isPaid !== false) {
                            const purchaseRef = db.collection('purchases').doc(userId).collection('tests').doc(seriesDoc.id);
                            const purchaseDoc = await purchaseRef.get();

                            if (!purchaseDoc.exists || purchaseDoc.data().status !== 'enrolled') {
                                console.warn(`🚫 [FRAUD] User ${userId} tried to access paid test ${req.params.id} without purchase`);
                                return res.status(403).json({
                                    message: 'Purchase required. This test belongs to a paid series.',
                                    requiresPurchase: true,
                                    seriesId: seriesDoc.id
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error checking paid series access:', e);
                    // Don't block on error — fail open for check, but log it
                }
            }
        }

        // If User has attempted, we SHOW correctOption.
        // If User has NOT attempted, we HIDE correctOption (Security).

        let questionsToSend = data.questions || [];

        if (!hasAttempted) {
            // Sanitize for new attempts
            questionsToSend = questionsToSend.map((q, i) => ({
                ...q,
                _id: q._id || `q_${doc.id}_${i}`,
                correctOption: undefined,
                correctOptions: undefined,
                integerAnswer: undefined
            }));
        } else {
            // Ensure IDs even for review
            questionsToSend = questionsToSend.map((q, i) => ({
                ...q,
                _id: q._id || `q_${doc.id}_${i}`
            }));
        }

        res.status(200).json({ _id: doc.id, ...data, questions: questionsToSend });
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
        const testRef = db.collection('tests').doc(req.params.id);
        const testDoc = await testRef.get();

        if (!testDoc.exists) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const test = testDoc.data();
        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        const attemptData = [];

        // Map for lookup. Note: In Firestore, questions are just array objects, they might not have unique _id unless we added them.
        // My previous code expected q._id. Admin creating tests uses the UI which currently doesn't add _id.
        // BUT invalidating the reliance on q._id is risky.
        // Let's assume we match by Index if ID is missing or match by Text?
        // Index is safer for specific test instance.
        // The submitted answers usually contain questionId.
        // If questionId is missing in `questions` array objects, we have a problem.
        // Fix: My `getTestById` above adds a dummy ID if missing, but that's random per request! 
        // THIS IS ARCTITECTURALLY FLAWED if IDs aren't persistent.
        // FIX: The seed script and Admin UI should add IDs. 
        // HOWEVER, to be robust: let's match by index provided we tell frontend the index.
        // Frontend uses `q._id`.

        // TEMPORARY FIX: If test questions don't have IDs, we can't reliably score.
        // I will assume for now we use index as ID if real ID is missing, but frontend sends ID.
        // Let's rely on the fact that I will re-seed data properly or update the Admin tool to add IDs.
        // For now, let's map by text comparison if ID fails? No, questions might be duplicate text.

        // Simpler: The frontend received `questions` with generated IDs (random) in `getTestById` above!
        // So the frontend sends back those random IDs. 
        // Iterate through the `questions` array and try to find equality?
        // Since `getTestById` generates random IDs on the fly, we CANNOT verify them on submit unless we stored them.
        // CRITICAL FIX: `getTestById` must NOT return random IDs if they aren't persisted.

        // I must update `createTest` to add IDs to questions.
        // AND for `submitTest`, I must iterate carefully.

        // Let's update `createTest` logic in this replacement as well (handled above? No, I didn't add IDs in createTest).
        // Actually, let's handle `submitTest` by assuming the `questions` array order matches. 
        // But the frontend sends `questionId`.

        // STRATEGY: 
        // 1. In `createTest` (Admin), assume data comes with IDs or we generate them.
        // 2. In `submitTest`, if we can't find by ID, we fail?
        // Let's look at `users` answers.

        // Let's create a map based on question text (risky but works for likely unique questions)
        // OR better: Just loop and check `questionId`.
        // If `questionId` corresponds to nothing, we skip?
        // Wait, Mongoose subdocs had `_id` automatically. Firestore object arrays do NOT.
        // Implementation:
        // When checking answers, we iterate `test.questions`.
        // If `test.questions` elements have no `_id`, we can't match `answer.questionId`.

        // PROPOSED FIX for Legacy Mongoose compatibility:
        // We will assume `answer.questionId` might be an index if it's a number? No, mongo IDs are strings.

        // Let's just Loop through users answers and match against test.questions.
        // Ideally, test.questions have stable IDs.
        // I will update the Seed script to add IDs.

        // Helper to ensure questions have IDs
        const ensureIds = (qs) => qs.map((q, i) => ({
            ...q,
            _id: q._id || `q_${req.params.id}_${i}` // Deterministic Fallback
        }));

        const dbQuestions = ensureIds(test.questions || []);
        const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

        // Loop through answers using the map
        answers.forEach(ans => {
            let question = questionMap.get(ans.questionId);

            // Fallback: If ID mismatch (legacy), try index matching if ID looks like index-based
            if (!question && ans.questionId && ans.questionId.startsWith(`q_${req.params.id}_`)) {
                const idx = parseInt(ans.questionId.split('_').pop());
                if (!isNaN(idx)) question = dbQuestions[idx];
            }

            if (question) {
                let isCorrect = false;

                // SCORING LOGIC BASED ON TYPE
                if (question.type === 'msq') {
                    const userAns = Array.isArray(ans.selectedOption) ? ans.selectedOption : [ans.selectedOption];
                    const correctAns = question.correctOptions || [];
                    // Sort both for comparison
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
                    // MCQ
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
            testId: req.params.id, // Store as String for querying
            testDetails: { // Store metadata separately
                _id: req.params.id,
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

// @desc    Update a test
// @route   PUT /api/tests/:id
// @access  Admin
exports.updateTest = async (req, res) => {
    try {
        const { title, duration, totalMarks, subject, category, difficulty, instructions, startTime, endTime, questions, isVisible, maxAttempts, resultVisibility, resultDeclarationTime, expiryDate } = req.body;

        const updateData = {
            title,
            duration_minutes: duration !== undefined ? Number(duration) : undefined,
            total_marks: totalMarks !== undefined ? Number(totalMarks) : undefined,
            subject,
            category,
            difficulty,
            instructions,
            startTime,
            endTime,
            isVisible,
            maxAttempts: maxAttempts !== undefined ? Number(maxAttempts) : undefined,
            expiryDate,
            resultVisibility,
            resultDeclarationTime,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        if (questions) {
            updateData.questions = questions.map((q, i) => ({
                ...q,
                _id: q._id || `q_${Date.now()}_${i}`,
                solution: q.solution || '',
                solutionImage: q.solutionImage || ''
            }));
        }

        await db.collection('tests').doc(req.params.id).update(updateData);

        res.status(200).json({ _id: req.params.id, ...updateData });
    } catch (error) {
        console.error("Update Test Error:", error);
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
                if (!userField) return;
                if (seriesField !== userField) return;
            }
            series.push({ id: doc.id, ...data });
        });

        res.status(200).json(series);
    } catch (error) {
        console.error("Fetch Series Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Single Series by ID with its Tests
// @route   GET /api/tests/series/:id
// @access  Authenticated
exports.getSeriesById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('testSeries').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Series not found' });
        }

        const seriesData = { id: doc.id, ...doc.data() };

        // Fetch associated tests if testIds exist
        let tests = [];
        if (seriesData.testIds && seriesData.testIds.length > 0) {
            // Firestore 'in' queries support max 30 items per batch
            const batchSize = 30;
            for (let i = 0; i < seriesData.testIds.length; i += batchSize) {
                const batch = seriesData.testIds.slice(i, i + batchSize);
                const testsSnapshot = await db.collection('tests')
                    .where('__name__', 'in', batch)
                    .get();

                testsSnapshot.forEach(tDoc => {
                    const tData = tDoc.data();
                    tests.push({
                        _id: tDoc.id,
                        title: tData.title,
                        duration_minutes: tData.duration_minutes,
                        total_marks: tData.total_marks,
                        subject: tData.subject,
                        category: tData.category || 'General',
                        difficulty: tData.difficulty,
                        questionCount: tData.questions?.length || 0
                    });
                });
            }
        }

        res.status(200).json({ series: seriesData, tests });
    } catch (error) {
        console.error("Fetch Series By ID Error:", error);
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
