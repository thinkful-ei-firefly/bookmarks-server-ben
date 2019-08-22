const app = require('../src/app');

describe('App', () => {
  it('GET / responds with 200 containing "Please visit /bookmarks for a list of bookmarks!"', () => {
    return supertest(app)
      .get('/')
      .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
      .expect(200, 'Please visit /bookmarks for a list of bookmarks!');
  });
});
