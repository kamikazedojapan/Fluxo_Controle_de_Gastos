const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const {
  calculateDailySummary,
  validateNewExpense,
} = require('../domain/dailyExpenseCalculator');

function currentDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function getCurrentBudget() {
  const budget = await Budget
    .findOne()
    .sort({ updatedAt: -1 })
    .lean();

  if (!budget) {
    throw new TypeError(
      'Configure seu planejamento antes de registrar gastos.',
    );
  }

  return budget;
}

async function getTodayExpenses(_request, response, next) {
  try {
    const budget = await getCurrentBudget();

    const today = currentDate();

    const expenses = await Expense.find({
      date: {
        $gte: budget.startDate,
        $lte: today,
      },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const summary = calculateDailySummary({
      monthlyIncome: budget.monthlyIncome,
      startDate: budget.startDate,
      currentDate: today,
      expenses,
    });

    const todayExpenses = expenses.filter(
      (expense) => expense.date === today,
    );

    response.json({
      date: today,
      ...summary,
      expenses: todayExpenses,
    });
  } catch (error) {
    next(error);
  }
}

async function createExpense(request, response, next) {
  try {
    const budget = await getCurrentBudget();

    const description = String(
      request.body.description || '',
    ).trim();

    const category = String(
      request.body.category || 'Outros',
    ).trim();

    const amount = Number(request.body.amount);

    if (!description) {
      throw new TypeError(
        'Informe uma descrição para o gasto.',
      );
    }

    const today = currentDate();

    const expenses = await Expense.find({
      date: {
        $gte: budget.startDate,
        $lte: today,
      },
    }).lean();

    const summary = validateNewExpense({
      monthlyIncome: budget.monthlyIncome,
      startDate: budget.startDate,
      currentDate: today,
      expenses,
      newExpenseAmount: amount,
    });

    const expense = await Expense.create({
      description,
      amount,
      category,
      date: today,
    });

    response.status(201).json({
      message: 'Gasto registrado com sucesso.',
      expense,
      summary,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteExpense(request, response, next) {
  try {
    const expense = await Expense.findByIdAndDelete(
      request.params.id,
    );

    if (!expense) {
      response.status(404).json({
        message: 'Gasto não encontrado.',
      });

      return;
    }

    response.json({
      message: 'Gasto removido com sucesso.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTodayExpenses,
  createExpense,
  deleteExpense,
};