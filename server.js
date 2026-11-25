const http = require('http');
const fs = require('fs');

// Load optional .env file (real environment variables take priority)
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
};

const startedAt = Date.now();

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, {
      status: 'ok',
      service: config.name,
      environment: config.env,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    });
  }
  if (req.method === 'GET' && req.url === '/') {
    return send(res, 200, { service: config.name, health: '/health' });
  }
  send(res, 404, { error: 'Not Found' });
});

server.listen(config.port, config.host, () => {
  console.log(`${config.name} running on http://localhost:${config.port} (${config.env})`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
