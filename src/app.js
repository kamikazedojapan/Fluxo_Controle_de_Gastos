const path = require('path');
const express = require('express');
const budgetRoutes = require('./routes/budgetRoutes');
const savingsGoalRoutes = require('./routes/savingsGoalRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const { databaseMiddleware, hasMongoUri } = require('./config/database');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, mongodbConfigured: hasMongoUri() });
});

app.use('/api/budget', databaseMiddleware, budgetRoutes);
app.use('/api/savings-goal', databaseMiddleware, savingsGoalRoutes);
app.use('/api/expenses', databaseMiddleware, expenseRoutes);

app.use((error, _request, response, _next) => {
  const status = error instanceof TypeError || error.name === 'ValidationError' ? 400 : 500;
  if (status === 500) console.error(error);
  response.status(status).json({
    message: status === 400 ? error.message : 'Não foi possível concluir a operação no servidor.',
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

module.exports = app;
