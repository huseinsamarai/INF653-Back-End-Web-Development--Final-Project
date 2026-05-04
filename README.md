# US States API

Node.js REST API for U.S. state data using Express and MongoDB.

## Features

- `GET /api/states/`
- `GET /api/states/?contig=true`
- `GET /api/states/?contig=false`
- `GET /api/states/:state`
- `GET /api/states/:state/funfact`
- `GET /api/states/:state/capital`
- `GET /api/states/:state/nickname`
- `GET /api/states/:state/population`
- `GET /api/states/:state/admission`
- `POST /api/states/:state/funfact`
- `PATCH /api/states/:state/funfact`
- `DELETE /api/states/:state/funfact`

## Project Files

- `server.js` — Express app and route handlers
- `config/db.js` — MongoDB connection helper
- `models/States.js` — Mongoose model
- `middleware/verifyStates.js` — Validates state abbreviations
- `scripts/seedFunFacts.js` — Seeds required fun facts
- `public/index.html` — Root HTML page
- `statesData.json` — State data file provided for the project

## Requirements

- Node.js
- MongoDB Atlas database
- `statesData.json` in the project root
- `.env` file in the project root

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.yourcluster.mongodb.net/states?retryWrites=true&w=majority
PORT=3000
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Seed the required fun facts:
   ```bash
   npm run seed
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Testing

Open these routes in the browser or Postman:

- `http://localhost:3000/`
- `http://localhost:3000/api/states/`
- `http://localhost:3000/api/states/KS`

## Deployment

Set `DATABASE_URI` in your hosting environment and run the app with:

```bash
npm start
```

## Notes

- State abbreviations are case-insensitive.
- `index` for PATCH and DELETE routes is one-based.
- Unknown routes return a 404 response.
