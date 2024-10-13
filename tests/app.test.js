const request = require('supertest');
const app = require('../src/server');

describe('Stock Checker App', () => {
  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });

  test('POST /check-stock with valid URL should return stock results', async () => {
    const response = await request(app)
      .post('/check-stock')
      .send({ url: 'https://www.thenorthface.ch/de-ch/p/schuhe-747784/multi-sport-gepolsterte-crew-socken-NF0A882H?color=JK3' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Stock Results');
  });

  test('POST /check-stock with invalid URL should return error', async () => {
    const response = await request(app)
      .post('/check-stock')
      .send({ url: 'invalid-url' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Invalid URL format');
  });

  // Add more test cases for other routes and edge cases
});
