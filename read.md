# Backend Service

A simple Node.js backend service with a health-check endpoint and environment configuration. It has no dependencies.

## Requirements
- Node.js 18 or newer

## Setup
1. Clone the repository:

       git clone <repo-url>
       cd backend-service

2. (Optional) Create a .env file from env.example and edit the values:

       cp env.example .env

3. Start the server:

       npm start

## Configuration
| Variable     | Default         | Description          |
|--------------|-----------------|----------------------|
| PORT         | 3000            | Port to listen on    |
| HOST         | 0.0.0.0         | Interface to bind    |
| NODE_ENV     | development     | Environment name     |
| SERVICE_NAME | backend-service | Name in responses    |

## Endpoints
- GET /        service info
- GET /health  health check

## Example

    curl http://localhost:3000/health

Response:

    {"status":"ok","service":"backend-service","environment":"development","uptimeSeconds":5,"timestamp":"2026-11-25T10:00:00.000Z"}
