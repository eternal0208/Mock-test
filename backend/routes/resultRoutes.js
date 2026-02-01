const express = require('express');
const router = express.Router();
const { getStudentResults, getAllResults } = require('../controllers/resultController');

router.get('/student/:userId', getStudentResults);
router.get('/admin', getAllResults);

module.exports = router;
