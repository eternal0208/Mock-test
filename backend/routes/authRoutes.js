const express = require('express');
const router = express.Router();
const { syncUser, getAllUsers } = require('../controllers/authController');

router.post('/sync', syncUser);
router.get('/users', getAllUsers);

module.exports = router;
