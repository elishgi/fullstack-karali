
// מייצר ראוטרים חדשים ומוגנים (בעזרת המידלוור)  
const express = require('express');
const router = express.Router();

const { getAllLogs, createLog, deleteLog } = require('../controllers/log.controller');
const auth = require('../middleware/auth');

//1. מחזיר כל תיעודים
router.get('/logs', auth, getAllLogs);
// יוצר תיעוד חדש
router.post('/logs', auth, createLog);
// מוחק תיעוד לפי מזהה
router.delete('/logs/:id', auth, deleteLog);

module.exports = router;

