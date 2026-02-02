const express = require('express');
const router = express.Router();
const { createTest, addQuestions, getAllTests, getTestById, submitTest } = require('../controllers/testController');

router.post('/', createTest);
router.put('/:id/questions', addQuestions);
router.get('/series', require('../controllers/testController').getAllSeries); // Move before /:id to prevent conflict
router.get('/', getAllTests);
router.get('/:id', getTestById);
router.post('/:id/submit', submitTest);
router.delete('/:id', require('../controllers/testController').deleteTest);
// Note: Move /series before /:id to not conflict (Done)
router.get('/:id/analytics', require('../controllers/testController').getTestAnalytics);
router.put('/:id/visibility', require('../controllers/testController').toggleVisibility); // New Route

module.exports = router;
