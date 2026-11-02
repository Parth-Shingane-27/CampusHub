# CampusHub 🎓

### College Event Management Platform

CampusHub is a web application that helps college students explore campus events and register for them online. It also provides an admin dashboard to manage events and view student registrations.

## ✨ Features

- **Google Sign-In** – Students sign in with their college Google account (`@mitaoe.ac.in` only); an account is created on first login.
- **Browse Events** – View upcoming college events, with search and category filters.
- **Event Registration** – Register online; registration closes automatically once an event's date and time have passed.
- **Student Dashboard** – View registrations, cancel bookings and edit the profile.
- **Admin Dashboard** – Create, edit and delete events; view event-wise registrations; view, edit and delete students.
- **Role-based Access** – Separate student and admin permissions enforced on the server.
- **Add to Calendar** – Google Calendar link or `.ics` download on every event and after registering.
- **Live Status Badges** – "Starts in 2 days", "Closing soon", "Ongoing" or "Completed" on each event.
- **Bookmarks** – Students can save events and see them on their dashboard.
- **Live Seat Counts** – Seat availability updates in real time (Server-Sent Events) without refreshing.
- **Pagination, Rate Limiting & Validation** – Events are paginated; the API is rate limited and validates input.
- **Responsive Design** – Works on different screen sizes.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| React.js | Builds the user interface |
| Vite | Runs and builds the frontend |
| Node.js | Runs JavaScript on the server |
| Express.js | Handles backend routes and API requests |
| MongoDB | Stores application data |
| Mongoose | Connects Node.js with MongoDB |
| CSS | Styles the application |
| Git and GitHub | Version control and code hosting |

## 📁 Project Structure

```text
CampusHub/
├── server/                 # Node.js and Express backend
│   ├── config/             # Database connection and seeding
│   ├── models/             # Mongoose models (User, Event, Registration)
│   ├── routes/             # auth, events, registrations, admin
│   ├── middleware/         # Authentication / role checks
│   ├── utils/              # Helpers (event timing)
│   └── server.js
├── client/                 # React (Vite) frontend; built to client/dist and served by Express
├── tests/                  # Automated tests (npm test)
├── .env.example            # Environment variable template
└── package.json
```

## ⚙️ How to Run the Project

### 1. Install Node.js

Download Node.js from [nodejs.org](https://nodejs.org/).

Check that Node.js and npm are installed:

```bash
node -v
npm -v
```

### 2. Download the Project

Clone the repository:

```bash
git clone https://github.com/sakshishewale01/CampusHub.git
cd CampusHub
```

### 3. Install Dependencies

Install the root dependencies:

```bash
npm install
```

Install the frontend dependencies:

```bash
cd client
npm install
cd ..
```

Install the backend dependencies if the server has its own `package.json`:

```bash
cd server
npm install
cd ..
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` in the project root and fill it in:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/campushub
SESSION_SECRET=a_long_random_string
ALLOWED_EMAIL_DOMAIN=mitaoe.ac.in
GOOGLE_CLIENT_ID=your_google_oauth_client_id
ADMIN_EMAIL=admin@mitaoe.ac.in
ADMIN_PASSWORD=change_me
```

For Google Sign-In, create an OAuth client ID (type "Web application") in Google Cloud Console and add `http://localhost:3000` under "Authorized JavaScript origins". Never commit your real `.env` file.

### 5. Start the Application

```bash
npm run build    # build the React frontend (needed once, and after frontend changes)
npm start        # http://localhost:3000 (frontend + API)
npm run client   # optional: Vite dev server on http://localhost:5173 with hot reload
npm test         # run the test suite
```

MongoDB must be running. Students sign in with Google; the admin uses the "Admin login" link on the login page.

## 🗄️ Database

CampusHub uses MongoDB to store application data.

The main data models are:

- **User:** Stores student and admin account information.
- **Event:** Stores event details, dates, categories, and capacity.
- **Registration:** Stores student event bookings and related information.

Mongoose is used to interact with the database.

## 🔐 Authentication and Authorization

CampusHub supports separate student and admin roles.

- Students sign in with Google (college domain only) and can browse events and manage their registrations.
- Admins can manage events, registrations and students.
- Protected backend routes check the user's role before every action.
- Admin passwords are stored as bcrypt hashes.

## 🚀 Deployment

The frontend can be deployed on [Vercel](https://vercel.com/).

For a full-stack deployment, configure the backend API, MongoDB connection, environment variables, and frontend API URL correctly. The Express backend must also be deployed to a runtime that supports it.

## 🎯 Project Objective

The main objective of CampusHub is to make college event management easier by providing one platform where students can discover events and admins can manage event information and registrations.
