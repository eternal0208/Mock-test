const express = require('express');
const router = express.Router();
const { createTest, addQuestions, getAllTests, getTestById, submitTest } = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', createTest);
router.put('/:id/questions', addQuestions);

// Public/Protected split: Ideally these should be protected to know the user's field
router.get('/series', protect, require('../controllers/testController').getAllSeries);
router.get('/', protect, getAllTests);
router.get('/:id', protect, getTestById);

router.post('/:id/submit', protect, submitTest);
router.post('/:id/feedback', protect, require('../controllers/testController').submitFeedback);
router.delete('/:id', require('../controllers/testController').deleteTest);

router.get('/:id/analytics', protect, require('../controllers/testController').getTestAnalytics);
router.put('/:id/visibility', require('../controllers/testController').toggleVisibility);

module.exports = router;
