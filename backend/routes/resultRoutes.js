const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStudentResults, getAllResults, getTestResults, getResultById } = require('../controllers/resultController');

router.get('/:id', protect, getResultById);
router.get('/student/:userId', protect, getStudentResults);
router.get('/admin', protect, getAllResults);
router.get('/test/:testId', protect, getTestResults);

module.exports = router;
