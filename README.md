# Backend Service: Tasks API with SQLite

A Node.js backend service with a health-check endpoint, environment configuration, and a full CRUD API for a `tasks` resource stored in a SQLite database. It has no npm dependencies.

## Requirements
- Node.js 22.13 or newer (uses the built-in `node:sqlite` module)

## Setup
1. Clone the repository:

       git clone <repo-url>
       cd backend-service

2. (Optional) Create a .env file from env.example and edit the values:

       cp env.example .env

3. Start the server (the database file and table are created automatically):

       npm start

## Configuration
| Variable     | Default         | Description              |
|--------------|-----------------|--------------------------|
| PORT         | 3000            | Port to listen on        |
| HOST         | 0.0.0.0         | Interface to bind        |
| NODE_ENV     | development     | Environment name         |
| SERVICE_NAME | backend-service | Name in responses        |
| DB_PATH      | tasks.db        | SQLite database file     |

## Task resource
| Field       | Type   | Rules                                          |
|-------------|--------|------------------------------------------------|
| id          | number | Auto-generated                                 |
| title       | string | Required, 1-100 characters                     |
| description | string | Optional, max 500 characters, default empty    |
| status      | string | todo (default), in_progress or done            |
| created_at  | string | Auto-generated (ISO timestamp)                 |
| updated_at  | string | Auto-updated (ISO timestamp)                   |

## Endpoints
| Method | Path              | Description                              | Success |
|--------|-------------------|------------------------------------------|---------|
| GET    | /health           | Health check (includes database check)   | 200     |
| POST   | /tasks            | Create a task                            | 201     |
| GET    | /tasks            | List tasks (optional ?status=done)       | 200     |
| GET    | /tasks/:id        | Get one task                             | 200     |
| PUT    | /tasks/:id        | Replace a task (title required)          | 200     |
| PATCH  | /tasks/:id        | Update only the fields you send          | 200     |
| DELETE | /tasks/:id        | Delete a task                            | 204     |

Errors: 400 for validation failures or invalid JSON, 404 for an unknown task or route.

## Sample requests

Health check:

    curl http://localhost:3000/health

Create:

    curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Learn Node.js","description":"Build a CRUD API"}'

List all, or filter by status:

    curl http://localhost:3000/tasks
    curl "http://localhost:3000/tasks?status=done"

Read one:

    curl http://localhost:3000/tasks/1

Update part of a task:

    curl -X PATCH http://localhost:3000/tasks/1 -H "Content-Type: application/json" -d '{"status":"done"}'

Replace a task:

    curl -X PUT http://localhost:3000/tasks/1 -H "Content-Type: application/json" -d '{"title":"Learn Node.js","description":"updated","status":"in_progress"}'

Delete:

    curl -X DELETE http://localhost:3000/tasks/1

Validation error example:

    curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"","status":"bad"}'

Response (400):

    {"error":"Validation failed","details":["title must be a non-empty string","status must be one of: todo, in_progress, done"]}

On Windows PowerShell, use `curl.exe` and put the JSON in double quotes with escaped inner quotes, or use Postman.
