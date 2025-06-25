const express = require('express');
const router = express.Router();

const { getAllLogs, createLog, deleteLog } = require('../controllers/log.controller');
const auth = require('../middleware/auth');


router.get('/logs', auth, getAllLogs);
router.post('/logs', auth, createLog);
router.delete('/logs/:id', auth, deleteLog);

module.exports = router;

