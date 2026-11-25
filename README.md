# Secure API

A small Express API demonstrating:

- **Authentication**: `/items` routes require an API key in the `x-api-key` header
- **Payload validation**: `POST /items` is validated with [Zod](https://zod.dev)
- **Consistent errors**: every error uses the same JSON shape

## Setup

```bash
npm install
cp .env.example .env      # then edit API_KEY
export API_KEY=your-secret-key   # (Windows PowerShell: $env:API_KEY="your-secret-key")
npm start
```

Server runs at `http://localhost:3000`.

## Endpoints

| Method | Path     | Auth     | Description          |
|--------|----------|----------|----------------------|
| GET    | /health  | public   | Health check         |
| GET    | /items   | API key  | List items           |
| POST   | /items   | API key  | Create an item       |

`POST /items` body:

```json
{ "name": "Pen", "price": 2.5, "quantity": 3 }
```

- `name`: string, 1–100 chars (required)
- `price`: number > 0 (required)
- `quantity`: integer >= 0 (optional, default 0)
- Unknown fields are rejected.

## Error format

All errors look like this:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload is invalid.",
    "details": [{ "field": "price", "message": "price must be greater than 0" }]
  }
}
```

| Status | Code               | When                        |
|--------|--------------------|-----------------------------|
| 400    | INVALID_JSON       | Malformed JSON body         |
| 401    | UNAUTHORIZED       | API key missing             |
| 403    | FORBIDDEN          | API key wrong               |
| 404    | NOT_FOUND          | Unknown route               |
| 413    | PAYLOAD_TOO_LARGE  | Body over 100kb             |
| 422    | VALIDATION_ERROR   | Payload fails validation    |
| 500    | INTERNAL_ERROR     | Unexpected server error     |

## Testing the protected routes

### Manual (curl)

```bash
# 1. No key -> 401
curl -i -X POST localhost:3000/items -H "Content-Type: application/json" \
  -d '{"name":"Pen","price":2.5}'

# 2. Wrong key -> 403
curl -i -X POST localhost:3000/items -H "x-api-key: wrong" \
  -H "Content-Type: application/json" -d '{"name":"Pen","price":2.5}'

# 3. Invalid payload -> 422
curl -i -X POST localhost:3000/items -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" -d '{"name":"","price":-5}'

# 4. Valid request -> 201
curl -i -X POST localhost:3000/items -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" -d '{"name":"Pen","price":2.5,"quantity":3}'

# 5. List items -> 200
curl -i localhost:3000/items -H "x-api-key: your-secret-key"
```

### Postman / Insomnia

Add a header `x-api-key: your-secret-key` to the request and set the body to raw JSON.

### Automated

```bash
npm test
```
(Requires Node 18+.)
