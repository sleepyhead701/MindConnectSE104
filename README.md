# MindConnect

MindConnect is a student mental-health support prototype designed to provide a private and approachable space for students to reflect on their emotions, find relevant self-help resources, and connect with school support services when needed.

The project includes a student workspace for daily check-ins, private diary entries, AI-assisted conversations, community posts, resources, statistics, and consultation bookings. It also provides a school/admin portal that presents anonymized trends, support requests, risk signals, feedback, and intervention outcomes. A local Node.js API connects both portals and can store data in local JSON files or MongoDB.

> MindConnect is an educational prototype and is not a replacement for professional mental-health care or emergency services.

## Main Features

### Student workspace

- Private diary entries with moods and topic tags.
- Anonymous community news feed with reactions and comments.
- AI-assisted chat and mental-health resource recommendations.
- Consultation booking, booking status, and post-support feedback.
- Personal mood statistics and profile management.

### School/Admin portal

- Dashboard with anonymized emotional and engagement metrics.
- Search and filters for support requests, risk level, status, and topic.
- Consultation workflow for confirming, completing, or rescheduling bookings.
- Intervention and student feedback summaries.
- Dashboard export in JSON, CSV, and printable PDF formats.

## Requirements

- Node.js installed on the local machine.
- Backend dependencies installed in `backend/` with `npm install`.
- A modern web browser.

## Run

The easiest way to start the project on Windows is:

```bat
start-mindconnect.cmd
```

This starts:

- Frontend: `http://localhost:5500`
- Backend API: `http://localhost:3000`

You can also serve `index.html` with another local static server and start the backend separately:

```bat
cd backend
npm install
npm start
```

The backend reads its configuration from `backend/.env`. By default, the prototype can run with the JSON files in `backend/data/`. MongoDB can be enabled through `MONGODB_URI`, `SKIP_DB_CONNECT`, and `REQUIRE_MONGODB`.

## Structure

- `index.html`: public introduction, login, and registration page.
- `student.html`: student workspace entry page.
- `school.html`: school/admin portal entry page.
- `assets/`: shared styles, fonts, icons, and images.
- `student/`: student frontend modules for Home, Diary, Resources, Stats, Chat, Booking, and Profile.
- `school/`: school/admin dashboard, filters, intervention workflows, and export features.
- `shared/`: shared frontend state and API helpers.
- `backend/`: Express API, authentication, Mongoose models, controllers, and local data store.
- `backend/data/`: local JSON fallback for users and application data.
- `tools/`: helper scripts and the local static server.
- `tests/`: Playwright integration tests.
