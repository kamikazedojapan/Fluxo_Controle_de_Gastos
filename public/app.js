const form = document.querySelector('#budget-form');
const results = document.querySelector('#daily-results');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('button');

const expenseForm =
  document.querySelector('#expense-form');

const expenseStatus =
  document.querySelector('#expense-status');

const expenseList =
  document.querySelector('#expense-list');

const expenseSubmitButton =
  expenseForm.querySelector('button');

const goalForm =
  document.querySelector('#goal-form');

const goalResults =
  document.querySelector('#goal-results');

const goalStatus =
  document.querySelector('#goal-status');


const currency = new Intl.NumberFormat(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL',
  },
);

const dateFormatter = new Intl.DateTimeFormat(
  'pt-BR',
  {
    timeZone: 'UTC',
  },
);

const API_BASE_URL =
  window.API_BASE_URL || '';


async function fetchJson(
  endpoint,
  options = {},
) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    options,
  );

  const contentType =
    response.headers.get('content-type') || '';

  const data = contentType.includes(
    'application/json',
  )
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message =
      data?.message ||
      `Falha na requisição ${endpoint} (${response.status})`;

    const detail = data?.detail
      ? ` Detalhe: ${data.detail}`
      : '';

    throw new Error(
      `${message}${detail}`,
    );
  }

  return data;
}


function parseMoney(value) {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized);
}


function inputMoney(value) {
  return Number(value).toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}


function setStatus(
  element,
  message = '',
  type = 'error',
) {
  element.textContent = message;

  element.classList.toggle(
    'success',
    type === 'success',
  );
}


function escapeHtml(value) {
  const characters = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(value).replace(
    /[&<>"']/g,
    (character) => characters[character],
  );
}


function renderDailySummary(data) {
  document.querySelector(
    '#available-today',
  ).textContent = currency.format(
    data.availableToday,
  );

  document.querySelector(
    '#daily-limit',
  ).textContent = currency.format(
    data.dailyBaseLimit,
  );

  document.querySelector(
    '#accumulated-balance',
  ).textContent = currency.format(
    data.accumulatedBalance,
  );

  document.querySelector(
    '#spent-today',
  ).textContent = currency.format(
    data.spentToday,
  );


  const todayDate =
    document.querySelector('#today-date');

  if (data.planDay === 0) {
    todayDate.textContent =
      'O planejamento ainda não começou';
  } else {
    const formattedDate =
      dateFormatter.format(
        new Date(`${data.date}T00:00:00Z`),
      );

    todayDate.textContent =
      `Dia ${data.planDay} · ${formattedDate}`;
  }


  renderExpenses(data.expenses);

  results.classList.add('visible');
}


function renderExpenses(expenses) {
  if (!expenses.length) {
    expenseList.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="empty-expenses"
        >
          Nenhum gasto registrado hoje.
        </td>
      </tr>
    `;

    return;
  }


  expenseList.innerHTML = expenses
    .map((expense) => `
      <tr>
        <td data-label="Descrição">
          ${escapeHtml(expense.description)}
        </td>

        <td data-label="Categoria">
          <span class="category-pill">
            ${escapeHtml(expense.category)}
          </span>
        </td>

        <td
          data-label="Valor"
          class="amount"
        >
          ${currency.format(expense.amount)}
        </td>

        <td
          data-label="Ação"
          class="expense-action"
        >
          <button
            type="button"
            class="delete-expense"
            data-expense-id="${expense._id}"
            aria-label="Excluir ${escapeHtml(
              expense.description,
            )}"
          >
            Excluir
          </button>
        </td>

      </tr>
    `)
    .join('');
}


async function loadDailyExpenses() {
  const data = await fetchJson(
    '/api/expenses/today',
  );

  renderDailySummary(data);

  return data;
}


async function loadBudget() {
  try {
    const data = await fetchJson(
      '/api/budget',
    );

    if (data.monthlyIncome > 0) {
      form.monthlyIncome.value =
        inputMoney(data.monthlyIncome);
    }

    form.startDate.value =
      data.startDate;


    if (data.monthlyIncome > 0) {
      await loadDailyExpenses();
    }
  } catch (error) {
    setStatus(
      status,
      error.message,
    );
  }
}


form.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    setStatus(status);

    submitButton.disabled = true;

    try {
      const monthlyIncome =
        parseMoney(
          form.monthlyIncome.value,
        );

      const payload = {
        monthlyIncome,
        
        startDate:
          form.startDate.value,
      };


      if (
        !Number.isFinite(
          payload.monthlyIncome,
        ) ||
        payload.monthlyIncome < 0
      ) {
        throw new Error(
          'Informe uma receita mensal válida.',
        );
      }


      await fetchJson(
        '/api/budget',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(payload),
        },
      );


      await loadDailyExpenses();


      setStatus(
        status,
        'Planejamento atualizado com sucesso.',
        'success',
      );


      results.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } catch (error) {
      setStatus(
        status,
        error.message,
      );
    } finally {
      submitButton.disabled = false;
    }
  },
);


expenseForm.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    setStatus(expenseStatus);

    expenseSubmitButton.disabled = true;

    try {
      const amount = parseMoney(
        expenseForm.amount.value,
      );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          'Informe um valor de gasto válido.',
        );
      }


      const payload = {
        description:
          expenseForm.description.value
            .trim(),

        amount,

        category:
          expenseForm.category.value,
      };


      const data = await fetchJson(
        '/api/expenses',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(payload),
        },
      );


      expenseForm.reset();

      expenseForm.category.value =
        'Outros';


      setStatus(
        expenseStatus,
        data.message,
        'success',
      );


      await loadDailyExpenses();
    } catch (error) {
      setStatus(
        expenseStatus,
        error.message,
      );
    } finally {
      expenseSubmitButton.disabled =
        false;
    }
  },
);


expenseList.addEventListener(
  'click',
  async (event) => {
    const button = event.target.closest(
      '[data-expense-id]',
    );

    if (!button) {
      return;
    }


    setStatus(expenseStatus);

    button.disabled = true;

    try {
      const expenseId =
        button.dataset.expenseId;


      const data = await fetchJson(
        `/api/expenses/${expenseId}`,
        {
          method: 'DELETE',
        },
      );


      setStatus(
        expenseStatus,
        data.message,
        'success',
      );


      await loadDailyExpenses();
    } catch (error) {
      setStatus(
        expenseStatus,
        error.message,
      );

      button.disabled = false;
    }
  },
);


/*
 * Navegação entre as telas.
 */
document
  .querySelectorAll('.nav-button')
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        document
          .querySelectorAll('.nav-button')
          .forEach((item) => {
            item.classList.toggle(
              'active',
              item === button,
            );
          });


        document
          .querySelectorAll('.app-view')
          .forEach((view) => {
            view.classList.toggle(
              'active',
              view.id ===
                button.dataset.view,
            );
          });


        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      },
    );
  });


function renderGoal(data) {
  document.querySelector(
    '#monthly-goal',
  ).textContent = currency.format(
    data.monthlyAmount,
  );

  document.querySelector(
    '#goal-total',
  ).textContent = currency.format(
    data.targetAmount,
  );

  document.querySelector(
    '#goal-term',
  ).textContent =
    `${data.months} ${
      data.months === 1
        ? 'mês'
        : 'meses'
    }`;

  document.querySelector(
    '#goal-finish',
  ).textContent =
    document.querySelector(
      '#goal-term',
    ).textContent;

  document.querySelector(
    '#goal-pill',
  ).textContent =
    `${data.months} ${
      data.months === 1
        ? 'parcela'
        : 'parcelas'
    }`;

  document.querySelector(
    '#goal-progress-bar',
  ).style.width = '100%';


  document.querySelector(
    '#goal-schedule-body',
  ).innerHTML = data.schedule
    .map((item) => `
      <tr>

        <td>
          Mês ${item.month}
        </td>

        <td class="amount">
          ${currency.format(
            item.contribution,
          )}
        </td>

        <td class="amount">
          ${currency.format(
            item.accumulated,
          )}
        </td>

        <td>
          <div class="progress-cell">

            <div class="mini-track">
              <i
                style="width:${item.progress}%"
              ></i>
            </div>

            <span>
              ${item.progress.toLocaleString(
                'pt-BR',
              )}%
            </span>

          </div>
        </td>

      </tr>
    `)
    .join('');


  goalResults.classList.add(
    'visible',
  );
}


async function loadSavingsGoal() {
  try {
    const data = await fetchJson(
      '/api/savings-goal',
    );

    if (!data) {
      return;
    }


    goalForm.targetAmount.value =
      inputMoney(data.targetAmount);

    goalForm.months.value =
      data.months;

    renderGoal(data);
  } catch (error) {
    setStatus(
      goalStatus,
      error.message,
    );
  }
}


goalForm.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    setStatus(goalStatus);

    const button =
      goalForm.querySelector('button');

    button.disabled = true;

    try {
      const payload = {
        targetAmount: parseMoney(
          goalForm.targetAmount.value,
        ),

        months: Number(
          goalForm.months.value,
        ),
      };


      if (
        !Number.isFinite(
          payload.targetAmount,
        )
      ) {
        throw new Error(
          'Informe um valor válido para a meta.',
        );
      }


      const data = await fetchJson(
        '/api/savings-goal',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(payload),
        },
      );


      renderGoal(data);


      goalResults.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } catch (error) {
      setStatus(
        goalStatus,
        error.message,
      );
    } finally {
      button.disabled = false;
    }
  },
);

loadBudget();
loadSavingsGoal();