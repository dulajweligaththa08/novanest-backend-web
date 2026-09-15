# NovaNest — Backend

Node.js + Express REST API powering the NovaNest platform.

## Tech Stack

- Node.js
- Express
- JWT Authentication
- Database ORM/driver (TBD)

## Getting Started

```bash
npm install
npm run dev
```

## Structure

```
backend/
├── src/
│   ├── routes/       # API route definitions
│   ├── controllers/  # Request handlers
│   ├── models/       # Data models
│   ├── middleware/   # Auth, error handling, etc.
│   └── config/       # App configuration
└── server.js         # Entry point
```
