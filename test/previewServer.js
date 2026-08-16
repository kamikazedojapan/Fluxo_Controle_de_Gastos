const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { calculateSavingsGoal } = require('../src/domain/savingsCalculator');

const publicDir = path.join(__dirname, '..', 'public');
let budget = { monthlyIncome: 1490.10, startDate: '2026-06-22' };
let savingsGoal = { targetAmount: 12000, months: 12 };

const server = http.createServer((request, response) => {
  if (request.url === '/api/budget' && request.method === 'GET') {
    response.setHeader('Content-Type', 'application/json');
    return response.end(JSON.stringify(calculateBudget(budget)));
  }
  if (request.url === '/api/budget' && request.method === 'PUT') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      budget = JSON.parse(body);
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(calculateBudget(budget)));
    });
    return;
  }
  if (request.url === '/api/savings-goal' && request.method === 'GET') {
    response.setHeader('Content-Type', 'application/json');
    return response.end(JSON.stringify(calculateSavingsGoal(savingsGoal)));
  }
  if (request.url === '/api/savings-goal' && request.method === 'PUT') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      savingsGoal = JSON.parse(body);
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(calculateSavingsGoal(savingsGoal)));
    });
    return;
  }

  const relativePath = request.url === '/' ? 'index.html' : request.url.slice(1);
  const filePath = path.join(publicDir, relativePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  fs.readFile(filePath, (error, data) => {
    if (error) { response.statusCode = 404; return response.end('Not found'); }
    response.setHeader('Content-Type', types[path.extname(filePath)] || 'text/plain');
    response.end(data);
  });
});

server.listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173'));
