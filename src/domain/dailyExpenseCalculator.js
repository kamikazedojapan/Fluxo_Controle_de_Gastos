const DAYS_IN_PLAN = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function assertMoney(value, fieldName) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `${fieldName} deve ser um número maior ou igual a zero.`,
    );
  }
}

function assertDate(date, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError(
      `${fieldName} deve estar no formato YYYY-MM-DD.`,
    );
  }

  const [year, month, day] = date.split('-').map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new TypeError(`${fieldName} é inválida.`);
  }
}

function dateToNumber(date) {
  const [year, month, day] = date.split('-').map(Number);

  return Date.UTC(
    year,
    month - 1,
    day,
  ) / MILLISECONDS_PER_DAY;
}

function toCents(value) {
  return Math.round(value * 100);
}

function toMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

function calculateDailyLimit(monthlyIncome) {
  assertMoney(monthlyIncome, 'Receita mensal');

  const incomeCents = toCents(monthlyIncome);

  return toMoney(
    Math.round(incomeCents / DAYS_IN_PLAN),
  );
}

function calculatePlanDay({
  startDate,
  currentDate,
}) {
  assertDate(startDate, 'Data inicial');
  assertDate(currentDate, 'Data atual');

  const start = dateToNumber(startDate);
  const current = dateToNumber(currentDate);

  const difference = current - start;

  if (difference < 0) {
    return 0;
  }

  return Math.min(
    difference + 1,
    DAYS_IN_PLAN,
  );
}

function calculateDailySummary({
  monthlyIncome,
  startDate,
  currentDate,
  expenses = [],
}) {
  assertMoney(monthlyIncome, 'Receita mensal');

  if (!Array.isArray(expenses)) {
    throw new TypeError(
      'Gastos devem ser uma lista.',
    );
  }

  const planDay = calculatePlanDay({
    startDate,
    currentDate,
  });

  const incomeCents = toCents(monthlyIncome);

  const dailyBaseLimit =
    calculateDailyLimit(monthlyIncome);

  if (planDay === 0) {
    return {
      planDay: 0,
      dailyBaseLimit,
      accumulatedBalance: 0,
      spentToday: 0,
      totalSpent: 0,
      availableToday: 0,
      remainingToday: 0,
      limitExceeded: false,
    };
  }

  const currentDateNumber =
    dateToNumber(currentDate);

  const startDateNumber =
    dateToNumber(startDate);

  let spentBeforeTodayCents = 0;
  let spentTodayCents = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);

    assertMoney(amount, 'Valor do gasto');
    assertDate(expense.date, 'Data do gasto');

    const expenseDate =
      dateToNumber(expense.date);

    // Ignora gastos anteriores ao planejamento
    // e gastos de dias futuros.
    if (
      expenseDate < startDateNumber ||
      expenseDate > currentDateNumber
    ) {
      continue;
    }

    if (expenseDate === currentDateNumber) {
      spentTodayCents += toCents(amount);
    } else {
      spentBeforeTodayCents += toCents(amount);
    }
  }

  /*
   * Quanto da renda já foi liberado até ontem.
   *
   * Exemplo no dia 3:
   * 2 / 30 da receita já haviam sido liberados.
   */
  const releasedBeforeTodayCents = Math.round(
    incomeCents *
      (planDay - 1) /
      DAYS_IN_PLAN,
  );

  /*
   * Quanto da renda está liberado até hoje.
   *
   * Exemplo no dia 3:
   * 3 / 30 da receita.
   */
  const releasedUntilTodayCents = Math.round(
    incomeCents *
      planDay /
      DAYS_IN_PLAN,
  );

  const accumulatedBalanceCents =
    releasedBeforeTodayCents -
    spentBeforeTodayCents;

  const totalSpentCents =
    spentBeforeTodayCents +
    spentTodayCents;

  const availableTodayCents =
    releasedUntilTodayCents -
    totalSpentCents;

  return {
    planDay,

    dailyBaseLimit,

    accumulatedBalance: toMoney(
      Math.max(accumulatedBalanceCents, 0),
    ),

    spentToday: toMoney(
      spentTodayCents,
    ),

    totalSpent: toMoney(
      totalSpentCents,
    ),

    availableToday: toMoney(
      Math.max(availableTodayCents, 0),
    ),

    remainingToday: toMoney(
      Math.max(availableTodayCents, 0),
    ),

    limitExceeded:
      availableTodayCents < 0,
  };
}

function validateNewExpense({
  monthlyIncome,
  startDate,
  currentDate,
  expenses = [],
  newExpenseAmount,
}) {
  assertMoney(
    newExpenseAmount,
    'Valor do novo gasto',
  );

  if (newExpenseAmount === 0) {
    throw new TypeError(
      'O valor do gasto deve ser maior que zero.',
    );
  }

  const summary = calculateDailySummary({
    monthlyIncome,
    startDate,
    currentDate,
    expenses,
  });

  const availableCents =
    toCents(summary.availableToday);

  const newExpenseCents =
    toCents(newExpenseAmount);

  if (newExpenseCents > availableCents) {
    const available = summary.availableToday
      .toFixed(2)
      .replace('.', ',');

    throw new TypeError(
      `Este gasto ultrapassa o valor disponível hoje. ` +
      `Disponível: R$ ${available}.`,
    );
  }

  return {
    ...summary,

    spentToday: toMoney(
      toCents(summary.spentToday) +
      newExpenseCents,
    ),

    totalSpent: toMoney(
      toCents(summary.totalSpent) +
      newExpenseCents,
    ),

    availableToday: toMoney(
      availableCents -
      newExpenseCents,
    ),

    remainingToday: toMoney(
      availableCents -
      newExpenseCents,
    ),
  };
}

module.exports = {
  calculateDailyLimit,
  calculatePlanDay,
  calculateDailySummary,
  validateNewExpense,
  DAYS_IN_PLAN,
};