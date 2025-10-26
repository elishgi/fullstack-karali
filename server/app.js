require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const logRoutes = require('./routes/log.routes');
const friendRoutes = require('./routes/friend.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Karali API is running');
});

app.use('/api/users', userRoutes);
app.use('/api', eventRoutes);
app.use('/api', logRoutes);
app.use('/api', friendRoutes);
app.use('/api', notificationRoutes);

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
