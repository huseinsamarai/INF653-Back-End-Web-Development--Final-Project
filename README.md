# US States API

Built by **Husein-Abdulraheem** for the INF653 final project.

This project is a Node.js REST API for US state data using Express and MongoDB. The assignment requires the `/states/` API route, a `States.js` Mongoose model with `stateCode` and `funfacts`, a `verifyStates` middleware, and a catch-all 404 route that returns HTML or JSON depending on the request headers. The project should also be deployed on Glitch with environment variables stored outside GitHub. fileciteturn1file0 fileciteturn1file1

## Files

- `server.js` — main Express app
- `config/db.js` — MongoDB connection helper
- `models/States.js` — Mongoose schema/model
- `middleware/verifyStates.js` — state-code validator
- `scripts/seedFunFacts.js` — inserts fun facts for the 5 required states
- `public/index.html` — root HTML page
- `statesData.json` — copy the provided states dataset into the project root

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:
   ```bash
   DATABASE_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.yourcluster.mongodb.net/states?retryWrites=true&w=majority
   PORT=3000
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Seed the required fun facts:
   ```bash
   npm run seed
   ```

## Endpoints

- `GET /states/`
- `GET /states/?contig=true`
- `GET /states/?contig=false`
- `GET /states/:state`
- `GET /states/:state/funfact`
- `GET /states/:state/capital`
- `GET /states/:state/nickname`
- `GET /states/:state/population`
- `GET /states/:state/admission`
- `POST /states/:state/funfact`
- `PATCH /states/:state/funfact`
- `DELETE /states/:state/funfact`

## Glitch deployment

Glitch supports environment variables and can import projects from GitHub; Glitch’s own materials describe environment-variable support and GitHub import/export as part of the platform. citeturn113803search0

### Steps

1. Push this project to GitHub.
2. On Glitch, create a new project and import from GitHub.
3. Open the Glitch project settings and add `DATABASE_URI` as an environment variable.
4. Do not upload `.env` to GitHub.
5. Make sure `statesData.json` is in the project root on Glitch.
6. Run the seed script once so the required states have fun facts.
7. Test the API at `https://your-project-name.glitch.me/states/`.

## Notes

- State abbreviations are checked case-insensitively.
- `index` for PATCH and DELETE is one-based.
- The root page is a public HTML page.
- Unknown routes return a 404 response.
