const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const {
  calculateDailySummary,
  validateNewExpense,
} = require('../src/domain/dailyExpenseCalculator');

const {
  calculateSavingsGoal,
} = require('../src/domain/savingsCalculator');


const publicDir = path.join(
  __dirname,
  '..',
  'public',
);


/*
 * Dados simulados em memória.
 *
 * No sistema real, essas informações
 * ficam armazenadas no MongoDB.
 */
let budget = {
  monthlyIncome: 1490.10,
  startDate: '2026-06-22',
};

let expenses = [];

let savingsGoal = {
  targetAmount: 12000,
  months: 12,
};


/*
 * Retorna a data atual no formato
 * YYYY-MM-DD usando o fuso da Bahia.
 */
function currentDate() {
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


/*
 * Facilita o envio de respostas JSON.
 */
function sendJson(
  response,
  statusCode,
  data,
) {
  response.statusCode = statusCode;

  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(data),
  );
}


/*
 * Lê e converte o body JSON
 * enviado pela requisição.
 */
function readJsonBody(request) {
  return new Promise(
    (resolve, reject) => {
      let body = '';

      request.on(
        'data',
        (chunk) => {
          body += chunk;
        },
      );

      request.on(
        'end',
        () => {
          try {
            resolve(
              JSON.parse(body || '{}'),
            );
          } catch (error) {
            reject(
              new TypeError(
                'JSON inválido.',
              ),
            );
          }
        },
      );

      request.on(
        'error',
        reject,
      );
    },
  );
}


const server = http.createServer(
  async (request, response) => {
    try {
      const requestUrl = new URL(
        request.url,
        'http://127.0.0.1:4173',
      );

      const pathname =
        requestUrl.pathname;


      /*
       * ==========================
       * PLANEJAMENTO
       * ==========================
       */

      if (
        pathname === '/api/budget' &&
        request.method === 'GET'
      ) {
        return sendJson(
          response,
          200,
          budget,
        );
      }


      if (
        pathname === '/api/budget' &&
        request.method === 'PUT'
      ) {
        const data =
          await readJsonBody(request);

        const monthlyIncome =
          Number(data.monthlyIncome);

        if (
          !Number.isFinite(
            monthlyIncome,
          ) ||
          monthlyIncome < 0
        ) {
          throw new TypeError(
            'Receita mensal deve ser um número maior ou igual a zero.',
          );
        }

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            data.startDate || '',
          )
        ) {
          throw new TypeError(
            'Data inicial inválida.',
          );
        }


        budget = {
          monthlyIncome,
          startDate:
            data.startDate,
        };


        return sendJson(
          response,
          200,
          budget,
        );
      }


      /*
       * ==========================
       * GASTOS DIÁRIOS
       * ==========================
       */

      if (
        pathname ===
          '/api/expenses/today' &&
        request.method === 'GET'
      ) {
        const today =
          currentDate();


        const summary =
          calculateDailySummary({
            monthlyIncome:
              budget.monthlyIncome,

            startDate:
              budget.startDate,

            currentDate:
              today,

            expenses,
          });


        const todayExpenses =
          expenses.filter(
            (expense) =>
              expense.date === today,
          );


        return sendJson(
          response,
          200,
          {
            date: today,

            ...summary,

            expenses:
              todayExpenses,
          },
        );
      }


      if (
        pathname === '/api/expenses' &&
        request.method === 'POST'
      ) {
        const data =
          await readJsonBody(request);


        const description =
          String(
            data.description || '',
          ).trim();


        const category =
          String(
            data.category || 'Outros',
          ).trim();


        const amount =
          Number(data.amount);


        if (!description) {
          throw new TypeError(
            'Informe uma descrição para o gasto.',
          );
        }


        const today =
          currentDate();


        const summary =
          validateNewExpense({
            monthlyIncome:
              budget.monthlyIncome,

            startDate:
              budget.startDate,

            currentDate:
              today,

            expenses,

            newExpenseAmount:
              amount,
          });


        const expense = {
          _id: randomUUID(),

          description,

          amount,

          category,

          date: today,
        };


        expenses.push(expense);


        return sendJson(
          response,
          201,
          {
            message:
              'Gasto registrado com sucesso.',

            expense,

            summary,
          },
        );
      }


      /*
       * DELETE /api/expenses/:id
       */
      if (
        pathname.startsWith(
          '/api/expenses/',
        ) &&
        request.method === 'DELETE'
      ) {
        const expenseId =
          pathname
            .split('/')
            .pop();


        const expenseIndex =
          expenses.findIndex(
            (expense) =>
              expense._id ===
              expenseId,
          );


        if (expenseIndex === -1) {
          return sendJson(
            response,
            404,
            {
              message:
                'Gasto não encontrado.',
            },
          );
        }


        expenses.splice(
          expenseIndex,
          1,
        );


        return sendJson(
          response,
          200,
          {
            message:
              'Gasto removido com sucesso.',
          },
        );
      }


      /*
       * ==========================
       * META DE ECONOMIA
       * ==========================
       */

      if (
        pathname ===
          '/api/savings-goal' &&
        request.method === 'GET'
      ) {
        return sendJson(
          response,
          200,
          calculateSavingsGoal(
            savingsGoal,
          ),
        );
      }


      if (
        pathname ===
          '/api/savings-goal' &&
        request.method === 'PUT'
      ) {
        const data =
          await readJsonBody(request);


        savingsGoal = {
          targetAmount:
            Number(
              data.targetAmount,
            ),

          months:
            Number(
              data.months,
            ),
        };


        return sendJson(
          response,
          200,
          calculateSavingsGoal(
            savingsGoal,
          ),
        );
      }


      /*
       * ==========================
       * ARQUIVOS ESTÁTICOS
       * ==========================
       */

      const relativePath =
        pathname === '/'
          ? 'index.html'
          : pathname.slice(1);


      const filePath =
        path.join(
          publicDir,
          relativePath,
        );


      const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };


      fs.readFile(
        filePath,
        (error, data) => {
          if (error) {
            response.statusCode = 404;

            return response.end(
              'Not found',
            );
          }


          response.setHeader(
            'Content-Type',
            types[
              path.extname(
                filePath,
              )
            ] || 'text/plain',
          );


          response.end(data);
        },
      );
    } catch (error) {
      sendJson(
        response,
        400,
        {
          message:
            error.message ||
            'Erro na requisição.',
        },
      );
    }
  },
);


server.listen(
  4173,
  '127.0.0.1',
  () => {
    console.log(
      'Preview: http://127.0.0.1:4173',
    );
  },
);