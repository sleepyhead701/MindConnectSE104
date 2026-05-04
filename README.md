# Mind_Connect

## Run frontend + backend (MongoDB)

1. Install dependencies:
   - `npm install`
2. Create env file:
   - copy `.env.example` to `.env`
3. Start MongoDB:
   - local: run MongoDB Community on default port `27017`
   - or use MongoDB Atlas and set `MONGODB_URI` in `.env`
4. Start backend:
   - `npm run dev`
5. Open app:
   - `http://localhost:5000/student.html`

Backend APIs are under `/api` and data is stored in MongoDB.
