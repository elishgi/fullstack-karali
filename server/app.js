require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);


mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.send('Karali API is running');
});

const eventRoutes = require('./routes/event.routes');
app.use('/api', eventRoutes);

const logRoutes = require('./routes/log.routes');
app.use('/api', logRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
