const express = require('express');
const router = express.Router();
const { createTest, updateTest, addQuestions, getAllTests, getTestById, submitTest } = require('../controllers/testController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheWithPrefix } = require('../middleware/cacheMiddleware');

// Cache clearing helper middleware
const clearTestCache = (req, res, next) => {
    clearCacheWithPrefix('/api/tests');
    next();
};

router.post('/', clearTestCache, createTest);
router.put('/:id', protect, clearTestCache, updateTest);
router.put('/:id/questions', clearTestCache, addQuestions);

// Public/Protected split: Ideally these should be protected to know the user's field
router.get('/series', optionalProtect, cacheMiddleware(600), require('../controllers/testController').getAllSeries);
router.get('/series/:id', protect, cacheMiddleware(300), require('../controllers/testController').getSeriesById);
router.get('/', optionalProtect, cacheMiddleware(300), getAllTests);
router.get('/:id', protect, cacheMiddleware(300), getTestById);

router.post('/:id/submit', protect, clearTestCache, submitTest);
router.post('/:id/feedback', protect, require('../controllers/testController').submitFeedback);
router.delete('/:id', clearTestCache, require('../controllers/testController').deleteTest);

router.get('/:id/analytics', protect, require('../controllers/testController').getTestAnalytics);
router.put('/:id/visibility', require('../controllers/testController').toggleVisibility);
// router.post('/:id/split', protect, require('../controllers/testController').splitTestBySubject);
// router.post('/merge', protect, require('../controllers/testController').mergeTests);

module.exports = router;
