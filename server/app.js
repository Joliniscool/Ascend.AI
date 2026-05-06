require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const path = require('path');

require('./db');
require('./config/passport');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? false : (process.env.CLIENT_URL || 'http://localhost:3000'),
  credentials: true,
}));
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: 14 * 24 * 60 * 60 }),

  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/chat', require('./routes/chat'));

if (isProduction) {
  const clientPath = path.join(__dirname, 'public');
  app.use(express.static(clientPath));
  app.get('*', (req, res) => res.sendFile(path.join(clientPath, 'index.html')));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));