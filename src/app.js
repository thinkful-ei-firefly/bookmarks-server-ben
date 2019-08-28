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

app.use(
  morgan(morganOption, {
    skip: () => NODE_ENV === 'test'
  })
);
app.use(helmet());
app.use(cors());
// app.use(express.json());

app.use(validateBearerToken);
app.use('/api/bookmarks', bookmarkRouter);
app.get('/', (req, res) => {
  res.send('Please visit /bookmarks for a list of bookmarks!');
});

app.use(errorHandler);

module.exports = app;
