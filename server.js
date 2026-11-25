const http = require('http');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite'); // built into Node 22.13+

// ---------- Configuration (.env is optional; real env vars win) ----------
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2];
    }
  }
}

const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  name: process.env.SERVICE_NAME || 'backend-service',
  dbPath: process.env.DB_PATH || 'tasks.db',
};

// ---------- Database ----------
const db = new DatabaseSync(config.dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'done')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )
`);

const STATUSES = ['todo', 'in_progress', 'done'];
const startedAt = Date.now();

// ---------- Validation ----------
// partial=false: full body (create / PUT). partial=true: only given fields (PATCH).
function validate(body, partial) {
  const errors = [];
  const data = {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object'], data };
  }

  if (body.title === undefined) {
    if (!partial) errors.push('title is required');
  } else if (typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title must be a non-empty string');
  } else if (body.title.trim().length > 100) {
    errors.push('title must be at most 100 characters');
  } else {
    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') errors.push('description must be a string');
    else if (body.description.length > 500) errors.push('description must be at most 500 characters');
    else data.description = body.description;
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
    else data.status = body.status;
  }

  return { errors, data };
}

// ---------- Helpers ----------
function send(res, status, body) {
  if (status === 204) { res.writeHead(204); return res.end(); }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) { reject({ status: 413, message: 'Body too large' }); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject({ status: 400, message: 'Invalid JSON' }); }
    });
  });
}

// ---------- Routes ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const method = req.method;

    if (method === 'GET' && path === '/health') {
      db.prepare('SELECT 1').get(); // proves the database is reachable
      return send(res, 200, {
        status: 'ok',
        service: config.name,
        environment: config.env,
        database: 'connected',
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      });
    }

    if (path === '/tasks') {
      // CREATE
      if (method === 'POST') {
        const { errors, data } = validate(await readJson(req), false);
        if (errors.length) return send(res, 400, { error: 'Validation failed', details: errors });
        const now = new Date().toISOString();
        const result = db
          .prepare('INSERT INTO tasks (title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run(data.title, data.description ?? '', data.status ?? 'todo', now, now);
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
        return send(res, 201, task);
      }
      // READ (list, optional ?status=done)
      if (method === 'GET') {
        const status = url.searchParams.get('status');
        if (status && !STATUSES.includes(status)) {
          return send(res, 400, { error: `status must be one of: ${STATUSES.join(', ')}` });
        }
        const tasks = status
          ? db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY id').all(status)
          : db.prepare('SELECT * FROM tasks ORDER BY id').all();
        return send(res, 200, tasks);
      }
    }

    const match = path.match(/^\/tasks\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!existing) return send(res, 404, { error: `Task ${id} not found` });

      // READ one
      if (method === 'GET') return send(res, 200, existing);

      // UPDATE (PUT = full, PATCH = partial)
      if (method === 'PUT' || method === 'PATCH') {
        const { errors, data } = validate(await readJson(req), method === 'PATCH');
        if (errors.length) return send(res, 400, { error: 'Validation failed', details: errors });
        const merged = {
          title: data.title ?? existing.title,
          description: data.description ?? (method === 'PUT' ? '' : existing.description),
          status: data.status ?? (method === 'PUT' ? 'todo' : existing.status),
        };
        db.prepare('UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?')
          .run(merged.title, merged.description, merged.status, new Date().toISOString(), id);
        return send(res, 200, db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
      }

      // DELETE
      if (method === 'DELETE') {
        db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        return send(res, 204);
      }
    }

    if (method === 'GET' && path === '/') {
      return send(res, 200, { service: config.name, endpoints: ['/health', '/tasks', '/tasks/:id'] });
    }

    send(res, 404, { error: 'Not Found' });
  } catch (err) {
    if (err && err.status) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`${config.name} running on http://localhost:${config.port} (${config.env}), db: ${config.dbPath}`);
});

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
