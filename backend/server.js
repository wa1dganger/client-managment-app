const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const fs = require('fs');
const path = require('path');

// Логирование: пишем одновременно в stdout (docker logs)
// и в файл (named volume)
const LOG_DIR = process.env.LOG_DIR || '/var/log/backend';
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Создаём директорию, если не существует
fs.mkdirSync(LOG_DIR, { recursive: true });

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function writeLog(level, args) {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map(String).join(' ')}\n`;
  process.stdout.write(line);
  logStream.write(line);
}

// Переопределяем глобальный console, чтобы все вызовы в коде
// автоматически шли в файл
console.log   = (...a) => writeLog('INFO',  a);
console.error = (...a) => writeLog('ERROR', a);
console.warn  = (...a) => writeLog('WARN',  a);
console.info  = (...a) => writeLog('INFO',  a);
console.debug = (...a) => writeLog('DEBUG', a);

const app = express();

app.use(express.json());
app.use(cors());

// Конфигурация из переменных окружения
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'DB_PORT'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
});

// Проверяем связь с БД при старте — чтобы healthcheck/логи сразу
// показали проблему, а не ждали первого запроса
pool.query('SELECT 1').then(
  () => console.log('[DB] connection OK'),
  (err) => {
    console.error('[DB] connection failed:', err.message);
    process.exit(1);
  }
);

// Роуты
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/clients', async (req, res) => {
  const { name, email, phone, company } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone, company) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, company]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Graceful shutdown — важно для docker stop
// Docker шлёт SIGTERM в PID 1 (node). Без обработчика node
// умрёт мгновенно, оборвав активные запросы и не закрыв пул
const server = app.listen(3001, () => {
  console.log(`Backend running on http://localhost:3001 (${process.env.NODE_ENV})`);
});

const shutdown = (signal) => {
  console.log(`[${signal}] shutting down...`);
  server.close(() => {
    pool.end().then(() => {
      console.log('[shutdown] done');
      process.exit(0);
    });
  });
  // Форс-выход, если что-то зависло
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
