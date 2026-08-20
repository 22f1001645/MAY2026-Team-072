const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token' // If auth fails it will return 401. Let's see if we can get a valid token or just read the DB.
  }
};
