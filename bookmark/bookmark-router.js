const express = require('express');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const logger = require('../src/logger');
const bookmarks = require('../src/store');

const xssBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  book_url: bookmark.book_url,
  book_desc: xss(bookmark.book_desc),
  rating: Number(bookmark.rating)
});

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(bookmark => xssBookmark(bookmark)));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, book_url, book_desc = '', rating } = req.body;
    const newBookmark = { title, book_url, book_desc, rating };

    for (const [key, value] of Object.entries(newBookmark))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(xssBookmark(bookmark));
      })
      .catch(next);
  });

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: 'Bookmark doesn\'t exist' }
          });
        }
        res.json(xssBookmark(bookmark));
      })
      .catch(next);
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res.status(404).send('Not found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted.`);

    res.status(204).end();
  });

module.exports = bookmarkRouter;
