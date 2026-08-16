const Budget = require('../models/Budget');


function defaultDate() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Bahia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date());
}


function isValidDateString(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split('-').map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}


async function getBudget(
  _request,
  response,
  next,
) {
  try {
    const budget = await Budget
      .findOne()
      .sort({ updatedAt: -1 })
      .lean();


    if (!budget) {
      response.json({
        monthlyIncome: 0,
        startDate: defaultDate(),
      });

      return;
    }


    response.json({
      monthlyIncome:
        budget.monthlyIncome,

      startDate:
        budget.startDate,
    });
  } catch (error) {
    next(error);
  }
}


async function saveBudget(
  request,
  response,
  next,
) {
  try {
    const monthlyIncome = Number(
      request.body.monthlyIncome,
    );

    const startDate =
      request.body.startDate;


    if (
      !Number.isFinite(monthlyIncome) ||
      monthlyIncome < 0
    ) {
      throw new TypeError(
        'Receita mensal deve ser um número maior ou igual a zero.',
      );
    }


    if (!isValidDateString(startDate)) {
      throw new TypeError(
        'Data inicial inválida.',
      );
    }


    const current = await Budget
      .findOne()
      .sort({ updatedAt: -1 });


    if (current) {
      await Budget.updateOne(
        {
          _id: current._id,
        },

        {
          $set: {
            monthlyIncome,
            startDate,
          },
        },

        {
          runValidators: true,
        },
      );
    } else {
      await Budget.create({
        monthlyIncome,
        startDate,
      });
    }


    response.json({
      monthlyIncome,
      startDate,
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
  getBudget,
  saveBudget,
};