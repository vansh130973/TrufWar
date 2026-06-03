# 🗺️ TurfWar — GPS Territory Capture Running Game

Claim the streets. Defend your ground. Run to win.

TurfWar is a mobile-first GPS-based territory game where you run through your city to claim 50×50m grid cells. Compete with other runners in real-time. Defend your territory or lose it to decay.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Maps | Leaflet.js + react-leaflet |
| Real-time | Socket.io |
| Auth | JWT (localStorage) |
| GPS | Browser Geolocation API |

---

## Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- A modern smartphone browser (Chrome on Android, Safari on iOS)
- HTTPS required for GPS on mobile (or use localhost for development)

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <your-repo>
cd turfwar

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/turfwar
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:5174
NODE_ENV=development
```

### 3. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env` (defaults work for local dev, no changes needed):
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

> **Note**: When proxying through Vite (`/api`), `VITE_API_URL` can be left empty. The Vite dev server proxies `/api` and `/socket.io` to port 5000.

### 4. Seed Sample Data (optional)

Seeds 5 demo users with territories around New Delhi, India.

```bash
cd backend
npm run seed

# Custom map center (your city):
CENTER_LAT=40.7128 CENTER_LNG=-74.0060 npm run seed  # New York
CENTER_LAT=51.5074 CENTER_LNG=-0.1278 npm run seed   # London
CENTER_LAT=19.0760 CENTER_LNG=72.8777 npm run seed   # Mumbai
```

Demo accounts (password: `demo123`):
- `speed@demo.com`
- `urban@demo.com`
- `night@demo.com`
- `turf@demo.com`
- `street@demo.com`

### 5. Run the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5174` in your browser.

---

## How to Play

1. **Register** an account (you get an auto-assigned color)
2. **Allow location** when prompted
3. Go to the **Map** screen
4. Hit **▶ Start Run** to begin GPS tracking
5. Walk/run around — your path is drawn on the map
6. Hit **⏹ Stop Run** — your path converts to colored territory cells
7. If you run through someone else's cells, you **capture them**
8. Check the **Leaderboard** to see your rank
9. Defend your territory within 7 days or it becomes neutral

---

## Territory Rules

| Timeframe | State |
|---|---|
| 0-3 days since last run | Fresh (full opacity) |
| 3-7 days | Decaying (warning notification sent) |
| 7+ days | Neutral (anyone can capture) |

---

## Project Structure

```
turfwar/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Run.js
│   │   ├── Territory.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── runs.js
│   │   ├── territory.js
│   │   ├── leaderboard.js
│   │   └── notifications.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── grid.js       # lat/lng ↔ 50m grid key conversion
│   │   └── decay.js      # territory decay job (hourly)
│   ├── server.js
│   ├── seed.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   ├── SocketContext.jsx
    │   │   └── ToastContext.jsx
    │   ├── hooks/
    │   │   └── useGPS.js
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── MapPage.jsx
    │   │   ├── LeaderboardPage.jsx
    │   │   ├── StatsPage.jsx
    │   │   └── NotificationsPage.jsx
    │   ├── components/
    │   │   └── Layout.jsx
    │   ├── utils/
    │   │   ├── api.js
    │   │   └── grid.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── package.json
```

---

## API Reference

### Auth
| Method | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, email, password}` | No |
| POST | `/api/auth/login` | `{email, password}` | No |
| GET | `/api/auth/me` | — | Yes |

### Runs
| Method | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/api/runs/start` | — | Yes |
| POST | `/api/runs/stop` | `{runId, coordinates}` | Yes |
| GET | `/api/runs/history/:userId` | — | Yes |

### Territory
| Method | Endpoint | Body | Auth |
|---|---|---|---|
| GET | `/api/territory/all` | `?swLat=&swLng=&neLat=&neLng=` | No |
| GET | `/api/territory/user/:userId` | — | Yes |
| POST | `/api/territory/capture` | `{gridKeys: [...]}` | Yes |

### Leaderboard
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/leaderboard` | No |

### Notifications
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/notifications` | Yes |
| PATCH | `/api/notifications/read-all` | Yes |
| PATCH | `/api/notifications/:id/read` | Yes |

---

## Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `join-user-room` | Client → Server | Join personal notification room |
| `run-started` | Client → Server | Broadcast start to other runners |
| `location-update` | Client → Server | Broadcast live position |
| `run-stopped` | Client → Server | Broadcast run end |
| `territory-captured` | Server → All | Territory ownership changed |
| `territory-update` | Server → All | Territory state changed |
| `notification` | Server → User | Personal notification |
| `territory-decayed` | Server → User | Decay notification |
| `runner-active` | Server → Others | Another runner started |
| `runner-location-update` | Server → Others | Runner position update |
| `runner-inactive` | Server → Others | Runner stopped |

---

## Known Limitations

- **Background GPS**: Browsers suspend geolocation when the tab is backgrounded on mobile. Keep the tab open while running.
- **GPS drift**: Low-accuracy GPS can create phantom territory captures. The 50m cell size absorbs most drift.
- **Concurrent capture conflicts**: If two users run through the same cell simultaneously, the last writer wins (no lock). Acceptable for a game.
- **Territory rendering at low zoom**: Rendering 5000+ cells at zoom level < 14 can be slow. Consider adding server-side bounding box filtering (query params supported on `/api/territory/all`).

---

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Build frontend: `cd frontend && npm run build`
3. Serve `frontend/dist` as static files from Express (or use a CDN)
4. Use MongoDB Atlas for the database
5. HTTPS is required for GPS on mobile — use a reverse proxy (nginx/Caddy) or a platform like Railway/Render/Fly.io

---

## License

MIT
