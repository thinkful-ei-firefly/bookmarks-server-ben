require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { NODE_ENV } = require('./config');
const errorHandler = require('./error-handler');
const validateBearerToken = require('./token-validator');
const bookmarkRouter = require('../bookmark/bookmark-router');

const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(errorHandler());
app.use(validateBearerToken);
app.use(bookmarkRouter);
app.get('/', (req, res) => {
  res.send('Please visit /bookmarks for a list of bookmarks!');
});

module.exports = app;
