const knex = require('knex');
const app = require('../src/app');
const {
  makeBookmarksArray,
  makeMaliciousBookmark
} = require('./bookmarks.fixtures');

describe('Bookmarks Endpoints', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('bookmarks_list').truncate());

  afterEach('cleanup', () => db('bookmarks_list').truncate());

  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks_list').insert(testBookmarks);
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200, testBookmarks);
      });
    });

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach('insert malicious bookmark', () => {
        return db.into('bookmarks_list').insert([maliciousBookmark]);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title);
            expect(res.body[0].book_desc).to.eql(expectedBookmark.book_desc);
          });
      });
    });
  });

  describe('GET /bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks_list').insert(testBookmarks);
      });

      it('responds with 200 and the specified Bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200, expectedBookmark);
      });
    });

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach('insert malicious bookmark', () => {
        return db.into('bookmarks_list').insert([maliciousBookmark]);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.book_desc).to.eql(expectedBookmark.book_desc);
          });
      });
    });
  });

  describe('POST /bookmarks', () => {
    it('creates a bookmark, responding with 201 and the new bookmark', () => {
      const newBookmark = {
        title: 'New bookmark!',
        book_url: 'http://www.new.com/',
        book_desc: 'New bookmark description',
        rating: 5
      };
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.book_url).to.eql(newBookmark.book_url);
          expect(res.body.book_desc).to.eql(newBookmark.book_desc);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
        })
        .then(res =>
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
            .expect(res.body)
        );
    });

    const requiredFields = ['title', 'book_url', 'rating'];

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'New bookmark!',
        book_url: 'http://www.new.com/',
        book_desc: 'New bookmark description',
        rating: 5
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newBookmark[field];

        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title);
          expect(res.body.content).to.eql(expectedBookmark.content);
        });
    });
  });
});
