const express = require('express');

const {
  getTodayExpenses,
  createExpense,
  deleteExpense,
} = require('../controllers/expenseController');

const router = express.Router();

router.get('/today', getTodayExpenses);

router.post('/', createExpense);

router.delete('/:id', deleteExpense);

module.exports = router;