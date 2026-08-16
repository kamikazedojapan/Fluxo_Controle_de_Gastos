const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateDailyLimit,
  calculatePlanDay,
  calculateDailySummary,
  validateNewExpense,
} = require('../src/domain/dailyExpenseCalculator');

test('calcula corretamente o limite diário base', () => {
  const result = calculateDailyLimit(3000);

  assert.equal(result, 100);
});

test('identifica corretamente o dia do planejamento', () => {
  const result = calculatePlanDay({
    startDate: '2026-08-01',
    currentDate: '2026-08-03',
  });

  assert.equal(result, 3);
});

test('calcula o restante do primeiro dia', () => {
  const result = calculateDailySummary({
    monthlyIncome: 3000,

    startDate: '2026-08-01',
    currentDate: '2026-08-01',

    expenses: [
      {
        date: '2026-08-01',
        amount: 60,
      },
    ],
  });

  assert.equal(result.planDay, 1);
  assert.equal(result.dailyBaseLimit, 100);
  assert.equal(result.spentToday, 60);
  assert.equal(result.availableToday, 40);
});

test('acumula o restante do dia anterior', () => {
  const result = calculateDailySummary({
    monthlyIncome: 3000,

    startDate: '2026-08-01',
    currentDate: '2026-08-02',

    expenses: [
      {
        date: '2026-08-01',
        amount: 60,
      },
    ],
  });

  assert.equal(result.dailyBaseLimit, 100);

  assert.equal(
    result.accumulatedBalance,
    40,
  );

  assert.equal(
    result.availableToday,
    140,
  );
});

test('acumula o restante de vários dias', () => {
  const result = calculateDailySummary({
    monthlyIncome: 3000,

    startDate: '2026-08-01',
    currentDate: '2026-08-03',

    expenses: [
      {
        date: '2026-08-01',
        amount: 60,
      },

      {
        date: '2026-08-02',
        amount: 90,
      },
    ],
  });

  assert.equal(
    result.accumulatedBalance,
    50,
  );

  assert.equal(
    result.availableToday,
    150,
  );
});

test('considera gastos feitos no dia atual', () => {
  const result = calculateDailySummary({
    monthlyIncome: 3000,

    startDate: '2026-08-01',
    currentDate: '2026-08-03',

    expenses: [
      {
        date: '2026-08-01',
        amount: 60,
      },

      {
        date: '2026-08-02',
        amount: 90,
      },

      {
        date: '2026-08-03',
        amount: 30,
      },
    ],
  });

  assert.equal(result.spentToday, 30);

  assert.equal(
    result.availableToday,
    120,
  );
});

test('não permite antecipar limite de dias futuros', () => {
  assert.throws(
    () => {
      validateNewExpense({
        monthlyIncome: 3000,

        startDate: '2026-08-01',
        currentDate: '2026-08-01',

        expenses: [],

        newExpenseAmount: 150,
      });
    },

    /ultrapassa o valor disponível hoje/,
  );
});

test('permite utilizar exatamente todo o valor disponível', () => {
  const result = validateNewExpense({
    monthlyIncome: 3000,

    startDate: '2026-08-01',
    currentDate: '2026-08-02',

    expenses: [
      {
        date: '2026-08-01',
        amount: 60,
      },
    ],

    newExpenseAmount: 140,
  });

  assert.equal(
    result.remainingToday,
    0,
  );

  assert.equal(
    result.spentToday,
    140,
  );
});

test('rejeita gasto de valor zero', () => {
  assert.throws(
    () => {
      validateNewExpense({
        monthlyIncome: 3000,

        startDate: '2026-08-01',
        currentDate: '2026-08-01',

        expenses: [],

        newExpenseAmount: 0,
      });
    },

    /maior que zero/,
  );
});