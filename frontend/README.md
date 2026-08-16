# SC1 Frontend

React web application for StarCraft 1 HTML5 game lobbying and player management.

## Features

- Player login/authentication
- Game lobby with active games list
- Create new game instances
- Join existing games
- Real-time game status updates
- Responsive design with retro theme

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

Start the development server:

```bash
npm start
```

Open http://localhost:3000 in your browser.

The app expects the backend server to be running on `http://localhost:5121` (see `.env` file).

### Configuration

Edit `frontend/.env` to change the API URL:

```env
REACT_APP_API_URL=http://localhost:5121
```

For production:

```env
REACT_APP_API_URL=https://yourdomain.com
```

### Build for Production

```bash
npm run build
```

Generates optimized build in `build/` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── LoginPage.js    # Login form
│   │   ├── Lobby.js        # Game lobby
│   │   └── CreateGameModal.js  # New game dialog
│   ├── api.js              # API client functions
│   ├── index.css           # Global styles
│   ├── App.js              # Main app component
│   └── index.js            # Entry point
├── .env                    # Environment variables
└── package.json
```

## How It Works

### Login Flow

1. User enters Player ID and Username
2. App calls `/api/auth/login` endpoint
3. Backend returns JWT token
4. Token stored in localStorage
5. User redirected to lobby

### Game Creation

1. User clicks "Create Game"
2. Enter game name and max players
3. App calls `/api/instance/create` with JWT token
4. Backend creates Docker container instance
5. New game appears in lobby

### Joining Games

1. User clicks "Join Game" on existing game
2. Opens game instance in new tab
3. Game runs on dedicated container port

## Components

### LoginPage
- Form for player ID and username
- Error handling
- Loading state

### Lobby
- Displays active games
- Create new game button
- Join game button
- End game button (if host)
- Auto-refresh every 5 seconds

### CreateGameModal
- Game name input
- Max players selector
- Create/Cancel buttons

## API Integration

The frontend communicates with the backend API:

- `POST /api/auth/login` — Authenticate player
- `POST /api/instance/create` — Create new game
- `GET /api/instance/:id` — Get game info
- `DELETE /api/instance/:id` — End game

See `frontend/src/api.js` for implementation.

## Styling

- Retro/cyberpunk theme with green terminal aesthetic
- CSS Grid for responsive layout
- Press Start 2P font for headings
- Hover effects and transitions
- Mobile-friendly

## Troubleshooting

### CORS errors
Make sure backend is running and has CORS enabled.

### "Unauthorized" when creating game
Token might be expired. Try logging out and in again.

### Can't connect to backend
Check that:
1. Backend server is running on port 5121
2. `REACT_APP_API_URL` in `.env` is correct
3. No firewall blocking connections

### Games not showing up
Games are stored in localStorage. Clear if having issues:
```javascript
localStorage.clear();
```

## Production Deployment

1. Build the app: `npm run build`
2. Serve `build/` folder from web server
3. Update `.env` with production API URL
4. Deploy behind nginx with SSL (via nginx proxy manager)

## Next Steps

- Add real database for persistent game data
- Implement WebSocket for real-time updates
- Add game chat and player communication
- Integrate SC1 HTML5 emulator
- Add player rankings/stats
