const express = require('express');
const router = express.Router();

const { getAllLogs, createLog, deleteLog } = require('../controllers/log.controller');

router.get('/logs', getAllLogs);
router.post('/logs', createLog);
router.delete('/logs/:id', deleteLog);


module.exports = router;
