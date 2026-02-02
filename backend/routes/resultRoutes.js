const express = require('express');
const router = express.Router();
const { getStudentResults, getAllResults, getTestResults } = require('../controllers/resultController');

router.get('/student/:userId', getStudentResults);
router.get('/admin', getAllResults);
router.get('/test/:testId', getTestResults);

module.exports = router;
