export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  x: number; // Grid coordinates, can be fractional during transition
  y: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
}

export interface Ghost extends Entity {
  id: number;
  color: string;
  mode: 'SCATTER' | 'CHASE' | 'FRIGHTENED' | 'EATEN';
  target: Point;
  scaredTimer: number;
  aiType: 'DUMB' | 'SMART';
  exitingHome: boolean; // Flag to track if ghost is leaving starting position
  pathToHome?: Direction[]; // Pre-calculated path when entering EATEN mode
  pathIndex?: number; // Current position in the path
  lastPathCell?: string; // Last processed cell in format "x,y" to prevent duplicate increments
}

export interface GameState {
  pacman: Entity;
  ghosts: Ghost[];
  grid: number[][]; // 0: Wall, 1: Pellet, 2: Empty, 3: Power, 4: Gate
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
  gameWon: boolean;
  frameCount: number;
  active: boolean; // Internal flag for the loop to know if game is running
}

export enum TileType {
  WALL = 0,
  PELLET = 1,
  EMPTY = 2,
  POWER_PELLET = 3,
  GHOST_GATE = 4,
}