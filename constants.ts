import { TileType } from './types';

export const TILE_SIZE = 18; // Pixels per tile (scaled for viewport fit)
export const BASE_SPEED = 0.12; 

// Level Configurations
export const LEVEL_CONFIGS = [
  { level: 1, speedMulti: 0.5, ghosts: 2, ai: 'DUMB' },
  { level: 2, speedMulti: 0.7, ghosts: 4, ai: 'DUMB' },
  { level: 3, speedMulti: 1.0, ghosts: 4, ai: 'SMART' },
];

export const getLevelConfig = (level: number) => {
  if (level <= LEVEL_CONFIGS.length) {
    return LEVEL_CONFIGS[level - 1];
  }
  // Scaling for higher levels
  return {
    level,
    speedMulti: 1.0 + (level - 3) * 0.05,
    ghosts: 4,
    ai: 'SMART'
  };
};

export const FRIGHTENED_SPEED = 0.06;

// Classic Pac-Man maze layout (28x31) - authentic arcade version
// W = Wall, . = Pellet, o = Power Pellet, - = Empty, G = Ghost, P = Pacman, T = Tunnel
const SAFE_MAP = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "W............WW............W",
  "W.WWWW.WWWWW.WW.WWWWW.WWWW.W",
  "WoWWWW.WWWWW.WW.WWWWW.WWWWoW",
  "W.WWWW.WWWWW.WW.WWWWW.WWWW.W",
  "W..........................W",
  "W.WWWW.WW.WWWWWWWW.WW.WWWW.W",
  "W.WWWW.WW.WWWWWWWW.WW.WWWW.W",
  "W......WW....WW....WW......W",
  "WWWWWW.WWWWW.WW.WWWWW.WWWWWW",
  "WWWWWW.WWWWW.WW.WWWWW.WWWWWW",
  "WWWWWW.WW..........WW.WWWWWW",
  "WWWWWW.WW.WWW--WWW.WW.WWWWWW",
  "WWWWWW.WW.W------W.WW.WWWWWW",
  "T.........W--GG--W.........T",
  "WWWWWW.WW.W------W.WW.WWWWWW",
  "WWWWWW.WW.WWWWWWWW.WW.WWWWWW",
  "WWWWWW.WW..........WW.WWWWWW",
  "WWWWWW.WW.WWWWWWWW.WW.WWWWWW",
  "WWWWWW.WW.WWWWWWWW.WW.WWWWWW",
  "W............WW............W",
  "W.WWWW.WWWWW.WW.WWWWW.WWWW.W",
  "W.WWWW.WWWWW.WW.WWWWW.WWWW.W",
  "Wo..WW.......P........WW..oW",
  "WWW.WW.WW.WWWWWWWW.WW.WW.WWW",
  "WWW.WW.WW.WWWWWWWW.WW.WW.WWW",
  "W......WW....WW....WW......W",
  "W.WWWWWWWWWW.WW.WWWWWWWWWW.W",
  "W.WWWWWWWWWW.WW.WWWWWWWWWW.W",
  "W..........................W",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

export const parseMap = (): { grid: number[][], pacmanStart: {x:number, y:number}, ghostStarts: {x:number, y:number}[] } => {
  const grid: number[][] = [];
  let pacmanStart = { x: 14, y: 23 }; // Default position
  const ghostStarts: {x:number, y:number}[] = [];

  const mapWidth = SAFE_MAP[0] ? SAFE_MAP[0].length : 28;
  
  for (let y = 0; y < SAFE_MAP.length; y++) {
    const row: number[] = [];
    const chars = SAFE_MAP[y].split('');
    
    for (let x = 0; x < mapWidth; x++) {
      const char = chars[x] || 'W';
      if (char === 'W') row.push(TileType.WALL);
      else if (char === '.') row.push(TileType.PELLET);
      else if (char === 'o') row.push(TileType.POWER_PELLET);
      else if (char === '-' || char === 'T') row.push(TileType.EMPTY); // T = tunnel
      else if (char === 'G') {
        row.push(TileType.EMPTY);
        ghostStarts.push({ x, y });
      } else if (char === 'P') {
        row.push(TileType.EMPTY);
        pacmanStart = { x, y };
      }
      else {
         row.push(TileType.EMPTY);
      }
    }
    grid.push(row);
  }
  
  if (ghostStarts.length === 0) {
      // Fallbacks if map parsing fails logic
      ghostStarts.push({x: 12, y: 14});
      ghostStarts.push({x: 13, y: 14});
      ghostStarts.push({x: 14, y: 14});
      ghostStarts.push({x: 15, y: 14});
  }
  
  return { 
    grid, 
    pacmanStart, 
    ghostStarts 
  };
};

export const GHOST_COLORS = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];