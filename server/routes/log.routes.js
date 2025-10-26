const express = require('express');
const { getAllLogs, createLog, deleteLog } = require('../controllers/log.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/logs', getAllLogs);
router.post('/logs', createLog);
router.delete('/logs/:id', deleteLog);

module.exports = router;
