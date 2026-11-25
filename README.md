# Secure Items API

A small REST API built with Node.js and Express. It is protected with an API key, validates every payload, returns one consistent error format, and ships with sample data, interactive docs and deployment configs, so another developer can run or deploy it in minutes.

- **GitHub repo:** `https://github.com/<your-username>/secure-api`  <!-- TODO: replace -->
- **Live service:** `https://<your-service>.onrender.com`  <!-- TODO: replace, or write "Not deployed" -->
- **Interactive docs:** `<live-url>/docs` (or `http://localhost:3000/docs` locally)

## Features

- API-key authentication on all `/items` routes (`x-api-key` header)
- Payload validation with [Zod](https://zod.dev) and field-level error details
- Consistent error responses: `{ "error": { "code", "message", "details?" } }`
- Full CRUD for items, plus `?q=` name search
- Sample data loaded on startup (`src/data/seed.json`)
- OpenAPI 3 spec at `/openapi.json` and Swagger UI at `/docs`
- Dockerfile and Render blueprint for deployment
- Automated tests (`npm test`)

## Quick start (local)

Requires Node.js 18+.

```bash
git clone https://github.com/<your-username>/secure-api.git
cd secure-api
npm install
export API_KEY=my-secret-key        # PowerShell: $env:API_KEY="my-secret-key"
npm start
```

Open http://localhost:3000/docs, click **Authorize**, enter your key, and try the endpoints.

## Configuration

| Variable    | Required | Default | Description                                      |
|-------------|----------|---------|--------------------------------------------------|
| `API_KEY`   | yes      | none    | Secret clients send in the `x-api-key` header    |
| `PORT`      | no       | `3000`  | Port to listen on (hosting platforms set this)   |
| `SEED_DATA` | no       | `true`  | Set to `false` to start with an empty store      |

See `.env.example`. Never commit a real `.env`.

## Sample data

On startup the service loads `src/data/seed.json` (5 items: Notebook, Ballpoint Pen, Desk Lamp, USB-C Cable, Wireless Mouse). Storage is in memory, so data resets on every restart.

## Endpoints

| Method | Path          | Auth    | Description                     |
|--------|---------------|---------|---------------------------------|
| GET    | `/health`     | public  | Health check                    |
| GET    | `/docs`       | public  | Swagger UI                      |
| GET    | `/openapi.json` | public | OpenAPI spec                   |
| GET    | `/items`      | API key | List items (`?q=` to search)     |
| GET    | `/items/:id`  | API key | Get one item                    |
| POST   | `/items`      | API key | Create an item                  |
| PUT    | `/items/:id`  | API key | Replace an item                 |
| DELETE | `/items/:id`  | API key | Delete an item                  |

Item body:

```json
{ "name": "Desk Lamp", "price": 24.99, "quantity": 35 }
```

- `name`: string, 1-100 chars (required)
- `price`: number > 0 (required)
- `quantity`: integer >= 0 (optional, default `0`)
- Unknown fields are rejected.

## Try it

```bash
export BASE=http://localhost:3000     # or your live URL
export KEY=my-secret-key

# Public
curl $BASE/health

# Protected: no key -> 401, wrong key -> 403
curl -i $BASE/items
curl -i $BASE/items -H "x-api-key: wrong"

# List, search, get one
curl $BASE/items -H "x-api-key: $KEY"
curl "$BASE/items?q=lamp" -H "x-api-key: $KEY"
curl $BASE/items/1 -H "x-api-key: $KEY"

# Create (201)
curl -i -X POST $BASE/items -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"Stapler","price":7.5,"quantity":40}'

# Invalid payload (422)
curl -i -X POST $BASE/items -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"","price":-5}'

# Update and delete
curl -X PUT $BASE/items/1 -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"Notebook A5","price":5,"quantity":100}'
curl -i -X DELETE $BASE/items/1 -H "x-api-key: $KEY"
```

## Error format

Every error has the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload is invalid.",
    "details": [{ "field": "price", "message": "price must be greater than 0" }]
  }
}
```

| Status | Code              | When                      |
|--------|-------------------|---------------------------|
| 400    | `INVALID_JSON`    | Malformed JSON body       |
| 400    | `INVALID_ID`      | `:id` is not a positive integer |
| 401    | `UNAUTHORIZED`    | API key missing           |
| 403    | `FORBIDDEN`       | API key wrong             |
| 404    | `NOT_FOUND`       | Unknown route or item     |
| 413    | `PAYLOAD_TOO_LARGE` | Body over 100 KB        |
| 422    | `VALIDATION_ERROR` | Payload fails validation |
| 500    | `INTERNAL_ERROR`  | Unexpected server error   |

## Tests

```bash
npm test
```

Covers auth (401/403), validation (422), malformed JSON (400), full CRUD, search, seed data, docs endpoints and the 404 shape.

## Deployment

### Option 1: Render (free tier)

1. Push this repo to GitHub.
2. In Render: **New > Blueprint**, select the repo. `render.yaml` configures everything and generates a random `API_KEY`.
   (Or **New > Web Service** manually: build `npm install`, start `npm start`, health check path `/health`, and add an `API_KEY` env var.)
3. After deploy, copy the service URL into the top of this README. Read the generated `API_KEY` under the service's **Environment** tab.
4. Verify: `curl https://<your-service>.onrender.com/health`

Free-tier services sleep when idle, so the first request after a pause can take about 30 seconds.

### Option 2: Docker

```bash
docker build -t secure-api .
docker run -p 3000:3000 -e API_KEY=my-secret-key secure-api
```

The same image works on Fly.io, Railway, Google Cloud Run, AWS App Runner and similar platforms. Set `API_KEY` as a secret and let the platform provide `PORT`.

### Option 3: Any Node host

Run `npm install --omit=dev` then `npm start` with `API_KEY` set. Put the service behind HTTPS (most platforms do this for you), because API keys travel in a header.

## Notes and limitations

- Data is stored in memory, so it resets on restart and is not shared across multiple instances. For production, swap the `items` array in `src/app.js` for a database.
- A single shared API key is used for simplicity. For per-user access, move to JWT or OAuth, or store hashed keys per client.
- Add rate limiting (e.g. `express-rate-limit`) before exposing publicly.

## Project structure

```
src/
  app.js        Express app: auth, validation, routes, error handling
  server.js     Entry point (reads env vars, loads seed data)
  openapi.js    OpenAPI 3 spec served at /openapi.json
  data/seed.json  Sample items
test/api.test.js
Dockerfile
render.yaml
.env.example
```
