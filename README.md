# Taskboard

A full-stack project management application featuring workspaces, Kanban-style task boards, notifications, and email integration.

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, React Router 7, Vite                  |
| Backend   | ASP.NET Core 9, Entity Framework Core 9         |
| Database  | MySQL (via Pomelo EF provider)                  |
| Auth      | ASP.NET Identity + JWT Bearer tokens            |
| Email     | Gmail OAuth2 (MailKit + Google.Apis.Auth)       |

---

## Project Structure

```
diplomen/
├── Frontend/          # React + Vite SPA
├── Taskboard/         # ASP.NET Core Web API + static file host
├── Taskboard.Tests/   # xUnit test project
├── package.json       # Root scripts (concurrently)
└── Dockerfile         # Multi-stage Docker build
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [.NET SDK 9.0](https://dotnet.microsoft.com/download/dotnet/9.0)
- A MySQL-compatible database (e.g. MySQL, PlanetScale, Aiven)

---

## Local Development

### 1. Clone the repository

```bash
git clone <repo-url>
cd diplomen
```

### 2. Configure environment variables

**Backend** — create `Taskboard/.env` (use `Taskboard/.env.example` as a template):

```env
ConnectionStrings__DefaultConnection=server=<host>;port=<port>;database=<db>;user=<user>;password=<pass>;SslMode=Required;
Jwt__Key=<your-jwt-secret>
Jwt__Issuer=http://localhost:5101

# Gmail OAuth2 (for email notifications)
GMAIL_EMAIL=your_email@gmail.com
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

**Frontend** — create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:5101
```

### 3. Install dependencies & run

From the **repository root**:

```bash
npm install
npm run dev
```

This uses `concurrently` to start both:
- **Vite** (watch mode, builds frontend into `Taskboard/wwwroot`)
- **`dotnet watch`** (hot-reload ASP.NET Core backend on port `5101`)

The app is served at **http://localhost:5101**.

---

## Available Scripts (root `package.json`)

| Script        | Description                                           |
|---------------|-------------------------------------------------------|
| `npm run dev` | Start frontend watch build + backend with hot reload  |
| `npm run build` | Build the frontend only (Vite production build)     |
| `npm start`   | Run the backend only (`dotnet run`)                   |

---

## Running Tests

```bash
dotnet test Taskboard.Tests/
```

---

## Docker

A multi-stage `Dockerfile` is included that:
1. Builds the React frontend with Node 20
2. Builds and publishes the .NET 9 backend
3. Serves everything from a single `aspnet:9.0` runtime image on port **8080**

```bash
docker build -t taskboard .
docker run -p 8080:8080 --env-file Taskboard/.env taskboard
```

---

## Key Features

- **Workspaces & Projects** — organize work into shared workspaces with multiple projects per workspace
- **Kanban Boards** — customizable status columns with drag-and-drop task management
- **Task Management** — create, assign, prioritize, and track tasks with due dates and labels
- **Dashboard** — per-user overview of assigned tasks and upcoming deadlines
- **Notifications** — in-app notification system for task and project events
- **Email Notifications** — transactional emails via Gmail OAuth2 (no password required)
- **Authentication** — JWT-based auth with ASP.NET Identity (register, login, profile)
- **Search** — cross-project task and workspace search
