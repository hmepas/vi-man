# VI-MAN 🎮

Classic Pac-Man arcade game with Vim-style controls (h/j/k/l).

## Features

- **Authentic Pac-Man Maze**: Classic 28x31 symmetric maze with tunnels
- **Vim Controls**: Navigate using H (left), J (down), K (up), L (right) or Arrow Keys
- **Touch Support**: Clickable control buttons for mobile devices
- **Progressive Difficulty**: 3 levels with increasing speed and smarter ghost AI
- **"Eyes" Mode**: Eaten ghosts return home with BFS pathfinding (pre-computed shortest path, chosen randomly if multiple)
- **Dynamic Ghost AI**:
  - **Level 1-2 (DUMB AI)**: Ghosts choose randomly at intersections with equal probability  
  - **Level 3 (SMART AI)**: Ghosts actively chase and corner the player - final level!
  - **Programmed Exit**: All ghosts navigate out of starting house before AI activates
- **Audio System**: Classic Pac-Man sounds (waka, death, power pellet)
- **Retro Aesthetic**: Pixel-perfect arcade experience with modern React

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` (or the port shown in console)

## Controls

- **H/J/K/L** or **Arrow Keys**: Move Pac-Man
- **SPACE**: Pause / Resume game
- **R**: Restart current level
- **IDDQD**: Type during gameplay to enable God Mode (infinite lives)

## URL Parameters

- `/` - Start from level 1 (default)
- `/2` - Start from level 2 (4 ghosts, faster)
- `/3` - Start from level 3 (SMART AI chases you)

## Technical Details

### Ghost AI & Pathfinding

- **EATEN Mode**: Uses BFS (Breadth-First Search) algorithm to find shortest path home
  - Path computed ONCE when ghost enters EATEN mode
  - Follows pre-calculated directions sequentially
  - Recalculates only if path exhausts before reaching home
  - Multiple equal-length paths? Random selection for unpredictability
  - Works identically across all difficulty levels

## Technologies

- React + TypeScript
- Vite
- Canvas API for rendering
- Web Audio API for sound effects
- PWA-ready favicon set (multiple sizes + `site.webmanifest`) in `public/`
