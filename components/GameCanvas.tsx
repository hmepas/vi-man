import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TILE_SIZE, BASE_SPEED, FRIGHTENED_SPEED, parseMap, GHOST_COLORS, getLevelConfig } from '../constants';
import { GameState, Direction, TileType, Entity, Ghost } from '../types';
import { soundService } from '../services/soundService';

const INITIAL_LIVES = 3;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStateLabel, setGameStateLabel] = useState<string>("");
  const requestRef = useRef<number>(0);
  const [godMode, setGodMode] = useState(false); // IDDQD cheat code
  const cheatBuffer = useRef<string>("");
  
  // Mutable game state
  const state = useRef<GameState | null>(null);

  // Parse URL for starting level
  useEffect(() => {
    const path = window.location.pathname;
    const levelMatch = path.match(/\/(\d+)/);
    if (levelMatch) {
      const urlLevel = parseInt(levelMatch[1]);
      if (urlLevel >= 1 && urlLevel <= 3) {
        setLevel(urlLevel);
      }
    }
  }, []);

  // Initialize Game
  const initGame = (currentLevel: number, resetScoreAndLives: boolean = true) => {
    const { grid, pacmanStart, ghostStarts } = parseMap();
    const config = getLevelConfig(currentLevel);
    
    const currentScore = state.current ? state.current.score : 0;
    const currentLives = state.current && !resetScoreAndLives ? state.current.lives : INITIAL_LIVES;

    const activeGhostStarts = ghostStarts.slice(0, config.ghosts);

    const newGhosts: Ghost[] = activeGhostStarts.map((start, i) => {
      // For levels 1-2: programmed exit (first goes RIGHT, second goes LEFT)
      // For level 3+: random direction
      let initialDir: Direction;
      if (currentLevel <= 2) {
        // Programmed start: alternate RIGHT and LEFT
        initialDir = i % 2 === 0 ? 'RIGHT' : 'LEFT';
      } else {
        const initialDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        initialDir = initialDirs[Math.floor(Math.random() * initialDirs.length)];
      }
      
      return {
        x: start.x,
        y: start.y,
        dir: initialDir,
        nextDir: initialDir,
        speed: BASE_SPEED * config.speedMulti * 0.85, // Slightly slower than pacman usually
        id: i,
        color: GHOST_COLORS[i % GHOST_COLORS.length],
        mode: currentLevel >= 3 ? 'CHASE' : 'SCATTER', // CHASE mode for level 3+
        target: { x: 0, y: 0 },
        scaredTimer: 0,
        aiType: config.ai as 'DUMB' | 'SMART',
        exitingHome: true, // All ghosts exit home at start
      };
    });

    state.current = {
      pacman: {
        x: pacmanStart.x,
        y: pacmanStart.y,
        dir: 'NONE',
        nextDir: 'NONE',
        speed: BASE_SPEED * config.speedMulti,
      },
      ghosts: newGhosts,
      grid: grid,
      score: resetScoreAndLives ? 0 : currentScore,
      lives: resetScoreAndLives ? INITIAL_LIVES : currentLives,
      level: currentLevel,
      gameOver: false,
      gameWon: false,
      paused: false,
      frameCount: 0,
      active: true,
    };
    
    setScore(state.current.score);
    setLives(state.current.lives);
    setLevel(currentLevel);
    
    setGameStateLabel(`LEVEL ${currentLevel}`);
    setTimeout(() => {
        if (state.current && !state.current.gameOver) {
            setGameStateLabel("");
        }
    }, 1500);

    if (gameStarted) {
      soundService.playStart();
    }
  };

  const handleStartGame = () => {
    soundService.resume();
    setGameStarted(true);
    initGame(level, true); // Use level from URL or default
    soundService.playStart();
  };

  const handleRestart = useCallback(() => {
     if (state.current) {
         if (state.current.gameOver) {
             initGame(1, true);
         } else if (state.current.gameWon) {
             // Level 3 is final, don't advance further
             const nextLevel = Math.min(state.current.level + 1, 3);
             initGame(nextLevel, false);
         } else {
             // If playing, just hard reset current level
             initGame(state.current.level, false);
         }
     }
  }, []);

  useEffect(() => {
    if (!gameStarted) {
        const { grid, pacmanStart, ghostStarts } = parseMap();
        state.current = {
            pacman: { x: pacmanStart.x, y: pacmanStart.y, dir: 'NONE', nextDir: 'NONE', speed: 0 },
            ghosts: ghostStarts.map((start, i) => ({ 
              x: start.x, y: start.y, dir: 'NONE', nextDir: 'NONE', speed: 0, id: i, 
              color: GHOST_COLORS[i], mode: 'SCATTER', target: {x:0,y:0}, scaredTimer: 0, aiType: 'SMART',
              exitingHome: false
            })),
            grid: grid,
            score: 0,
            lives: 3,
            level: 1,
            gameOver: false,
            gameWon: false,
            paused: true,
            frameCount: 0,
            active: false 
        };
    }
  }, [gameStarted]);

  const handleInput = useCallback((key: string) => {
      if (!state.current) return;

      const k = key.toLowerCase();

      // Cheat code detection (IDDQD)
      if (k.length === 1 && /[a-z]/.test(k)) {
          cheatBuffer.current += k;
          if (cheatBuffer.current.length > 10) {
              cheatBuffer.current = cheatBuffer.current.slice(-10);
          }
          if (cheatBuffer.current.includes('iddqd')) {
              const newGodMode = !godMode;
              setGodMode(newGodMode);
              setGameStateLabel(newGodMode ? "GOD MODE ON" : "GOD MODE OFF");
              setTimeout(() => {
                  if (state.current && !state.current.gameOver && !state.current.gameWon) {
                      setGameStateLabel("");
                  }
              }, 1500);
              cheatBuffer.current = "";
          }
      }

      // R for Restart anytime
      if (k === 'r') {
          handleRestart();
          return;
      }

      // Space Logic
      if (k === ' ') {
          if (state.current.gameOver || state.current.gameWon) {
              handleRestart();
          } else {
              // Toggle Pause
              state.current.paused = !state.current.paused;
              setGameStateLabel(state.current.paused ? "PAUSED" : "");
          }
          return;
      }

      if (!state.current.active || state.current.paused) return;
      
      if (k === 'h' || k === 'arrowleft') state.current.pacman.nextDir = 'LEFT';
      if (k === 'l' || k === 'arrowright') state.current.pacman.nextDir = 'RIGHT';
      if (k === 'k' || k === 'arrowup') state.current.pacman.nextDir = 'UP';
      if (k === 'j' || k === 'arrowdown') state.current.pacman.nextDir = 'DOWN';
  }, [handleRestart, godMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleInput(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  // --- Physics & Logic ---

  const getAxis = (dir: Direction) => {
    if (dir === 'UP') return { x: 0, y: -1 };
    if (dir === 'DOWN') return { x: 0, y: 1 };
    if (dir === 'LEFT') return { x: -1, y: 0 };
    if (dir === 'RIGHT') return { x: 1, y: 0 };
    return { x: 0, y: 0 };
  };

  const isWall = (x: number, y: number, grid: number[][], isGhost: boolean = false) => {
      // Bounds check
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return true;
      const tile = grid[y][x];
      if (tile === TileType.WALL) return true;
      if (!isGhost && tile === TileType.GHOST_GATE) return true; // Pacman can't enter ghost house
      return false;
  };

  const moveEntity = (entity: Entity, grid: number[][], isGhost: boolean = false) => {
      // 1. Current State
      const cx = Math.round(entity.x);
      const cy = Math.round(entity.y);
      const distFromCenter = Math.abs(entity.x - cx) + Math.abs(entity.y - cy);
      const isAtCenter = distFromCenter < 0.1; // Tight tolerance for turns

      // 2. Attempt Turn
      if (entity.nextDir !== 'NONE' && isAtCenter && entity.dir !== entity.nextDir) {
          // Only snap to center when ACTUALLY TURNING, not continuing same direction
          const nextAxis = getAxis(entity.nextDir);
          // Check if the tile in the Next Direction is valid
          if (!isWall(cx + nextAxis.x, cy + nextAxis.y, grid, isGhost)) {
              entity.dir = entity.nextDir;
              entity.x = cx; // Hard Snap
              entity.y = cy;
              if (!isGhost) entity.nextDir = 'NONE';
          }
      }

      // 3. Move along current direction
      if (entity.dir === 'NONE') return;

      const axis = getAxis(entity.dir);
      const nextX = entity.x + axis.x * entity.speed;
      const nextY = entity.y + axis.y * entity.speed;

      // 4. Collision Look-ahead (Clamping)
      // Check the tile IMMEDIATELY ahead.
      // If we are moving Right, we care about (cx + 1).
      // If nextX goes past cx (e.g. > cx + 0.01), check collision.
      
      let blocked = false;

      // Determine the "Next Tile" index we are moving towards
      const targetTileX = Math.round(cx + axis.x);
      const targetTileY = Math.round(cy + axis.y);

      // Are we trying to ENTER that tile?
      // If moving right (axis.x=1), we are entering if x > cx.
      // If moving left (axis.x=-1), we are entering if x < cx.
      
      const movingToTarget = (axis.x > 0 && nextX > cx) || (axis.x < 0 && nextX < cx) || 
                             (axis.y > 0 && nextY > cy) || (axis.y < 0 && nextY < cy);

      if (movingToTarget) {
          if (isWall(targetTileX, targetTileY, grid, isGhost)) {
              blocked = true;
          }
      }

      if (blocked) {
          // CLAMP to center
          entity.x = cx;
          entity.y = cy;
      } else {
          // Allow move
          entity.x = nextX;
          entity.y = nextY;
      }

      // Wrap Around
      if (entity.x < -0.5) entity.x = grid[0].length - 0.5;
      if (entity.x > grid[0].length - 0.5) entity.x = -0.5;
  };

  // Prison/Ghost House boundaries
  const isPrisonCell = (x: number, y: number): boolean => {
    return x >= 10 && x <= 17 && y >= 12 && y <= 15;
  };

  // BFS Pathfinding для режима EATEN - строит полный путь до дома
  const findPathHome = (startX: number, startY: number, homeX: number, homeY: number, grid: number[][]): Direction[] => {
    interface PathNode {
      x: number;
      y: number;
      path: Direction[];
    }
    
    const queue: PathNode[] = [{ x: startX, y: startY, path: [] }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);
    
    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Достигли дома?
      if (current.x === homeX && current.y === homeY) {
        return current.path;
      }
      
      // Пробуем все направления
      for (const dir of dirs) {
        const axis = getAxis(dir);
        let nx = current.x + axis.x;
        let ny = current.y + axis.y;
        
        // Обработка wrap-around (туннели)
        if (nx < 0) nx = grid[0].length - 1;
        if (nx >= grid[0].length) nx = 0;
        if (ny < 0) ny = grid.length - 1;
        if (ny >= grid.length) ny = 0;
        
        const key = `${nx},${ny}`;
        
        // Проверяем что клетка валидна и не посещена
        if (!visited.has(key) && !isWall(nx, ny, grid, true)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...current.path, dir]
          });
        }
      }
    }
    
    // Путь не найден (не должно случиться в валидной карте)
    return [];
  };

  const aiGhost = (ghost: Ghost, grid: number[][], pacman: Entity) => {
    // Ghosts only change direction at the center of tiles
    const cx = Math.round(ghost.x);
    const cy = Math.round(ghost.y);
    const atCenter = Math.abs(ghost.x - cx) < 0.1 && Math.abs(ghost.y - cy) < 0.1;

    // Only make decisions at intersections (center of tile)
    if (!atCenter) return;
    
    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const opp = ghost.dir === 'UP' ? 'DOWN' : 
               ghost.dir === 'DOWN' ? 'UP' : 
               ghost.dir === 'LEFT' ? 'RIGHT' : 
               ghost.dir === 'RIGHT' ? 'LEFT' : 'NONE';

    // Check if ghost is stuck (current direction is blocked)
    const currentAxis = getAxis(ghost.dir);
    const isCurrentBlocked = ghost.dir === 'NONE' || isWall(cx + currentAxis.x, cy + currentAxis.y, grid, true);

    // Collect valid directions FIRST (needed for all modes)
    const validDirs: Direction[] = [];
    dirs.forEach(d => {
        const axis = getAxis(d);
        if (!isWall(cx + axis.x, cy + axis.y, grid, true)) {
            // For EATEN mode: allow all directions including 180-degree turns
            if (ghost.mode === 'EATEN') {
                validDirs.push(d);
            } else {
                // Normal modes: no 180-degree turns unless stuck
                if (d !== opp || isCurrentBlocked) {
                    validDirs.push(d);
                }
            }
        }
    });

    // CRITICAL: If ghost is inside prison, force exitingHome protocol (for ALL AI types and modes except EATEN going home)
    if (isPrisonCell(cx, cy) && ghost.mode !== 'EATEN') {
        ghost.exitingHome = true;
    }

    // SPECIAL: Exiting home (all levels)
    const homeExitY = 11; // When y <= 11, ghost has exited
    
    if (ghost.exitingHome) {
        // Check if ghost has exited home area
        if (cy <= homeExitY) {
            ghost.exitingHome = false; // Exit complete, enable normal AI
        } else {
            // Still in home: move to center column (x=14) then UP
            const homeExitX = 14;
            
            if (cx !== homeExitX) {
                // Not at center column, move horizontally
                const targetDir = cx < homeExitX ? 'RIGHT' : 'LEFT';
                const targetAxis = getAxis(targetDir);
                if (!isWall(cx + targetAxis.x, cy + targetAxis.y, grid, true)) {
                    ghost.nextDir = targetDir;
                    return;
                }
            }
            
            // At center column or can't move horizontally, go UP
            const upAxis = getAxis('UP');
            if (!isWall(cx + upAxis.x, cy + upAxis.y, grid, true)) {
                ghost.nextDir = 'UP';
                return;
            }
            
            // Fallback: if UP blocked, try any direction
            for (const d of dirs) {
                const axis = getAxis(d);
                if (!isWall(cx + axis.x, cy + axis.y, grid, true)) {
                    ghost.nextDir = d;
                    return;
                }
            }
        }
    }
    
    // SPECIAL: EATEN mode - return to home center (14, 14)
    if (ghost.mode === 'EATEN') {
        const homeX = 14;
        const homeY = 14;
        const currentCell = `${cx},${cy}`;
        
        // Вычисляем путь ОДИН РАЗ при входе в режим EATEN
        if (!ghost.pathToHome || ghost.pathToHome.length === 0) {
            // BFS pathfinding строит полный путь до дома
            ghost.pathToHome = findPathHome(cx, cy, homeX, homeY, grid);
            ghost.pathIndex = 0;
            ghost.lastPathCell = currentCell;
            
            // Если путь найден, устанавливаем первое направление
            if (ghost.pathToHome.length > 0) {
                ghost.nextDir = ghost.pathToHome[0];
            } else {
                // Путь не найден - fallback на случайное направление
                if (validDirs.length > 0) {
                    ghost.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                }
            }
        } else {
            // Следуем по предвычисленному пути
            if (ghost.pathIndex !== undefined && ghost.pathIndex < ghost.pathToHome.length) {
                // Устанавливаем направление из пути
                ghost.nextDir = ghost.pathToHome[ghost.pathIndex];
                
                // Инкрементируем pathIndex только когда переместились в НОВУЮ клетку
                if (atCenter && currentCell !== ghost.lastPathCell) {
                    ghost.lastPathCell = currentCell;
                    ghost.pathIndex++;
                }
            } else {
                // Путь закончился, но еще не дошли до дома - пересчитываем
                ghost.pathToHome = findPathHome(cx, cy, homeX, homeY, grid);
                ghost.pathIndex = 0;
                ghost.lastPathCell = currentCell;
                
                if (ghost.pathToHome.length > 0) {
                    ghost.nextDir = ghost.pathToHome[0];
                }
            }
        }
        return; // Не обрабатываем другие AI режимы
    }

    if (validDirs.length === 0) return; // Stuck (shouldn't happen)

    // DUMB AI (Level 1-2) - Random movement at intersections
    if (ghost.aiType === 'DUMB' && ghost.mode !== 'EATEN') {
        // If just starting or blocked, pick any valid direction
        if (ghost.dir === 'NONE' || isCurrentBlocked) {
            ghost.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
            return;
        }

        // At intersection: check if there are NEW directions available (not current, not opposite)
        const newDirs = validDirs.filter(d => d !== ghost.dir && d !== opp);
        
        if (newDirs.length > 0) {
            // There's a choice! Roll dice: continue OR turn into new direction
            // Add current direction to choices (equal probability)
            const allChoices = [ghost.dir, ...newDirs];
            ghost.nextDir = allChoices[Math.floor(Math.random() * allChoices.length)];
        } else {
            // No new directions (corridor), keep going
            ghost.nextDir = ghost.dir;
        }
        return;
    }

    // SMART AI (Level 3+) - Chase/scatter behavior
    if (ghost.aiType === 'SMART') {
        if (validDirs.length > 0) {
            // Pick best dir
            let bestDir = validDirs[0];
            let minDist = Infinity;
            
            // Target selection
            let tx = pacman.x;
            let ty = pacman.y;
            
            if (ghost.mode === 'FRIGHTENED') {
                 // Random target (run away)
                 tx = Math.random() * grid[0].length;
                 ty = Math.random() * grid.length;
            } else if (ghost.mode === 'SCATTER') {
                 // For SMART AI: always chase, for DUMB: scatter to corners
                 if (ghost.aiType === 'SMART') {
                     tx = pacman.x;
                     ty = pacman.y;
                 } else {
                     tx = ghost.id === 0 ? 26 : ghost.id === 1 ? 1 : ghost.id === 2 ? 26 : 1;
                     ty = ghost.id === 0 ? 1 : ghost.id === 1 ? 1 : ghost.id === 2 ? 29 : 29;
                 }
            }

            // Greedy search for smart ghosts
            validDirs.forEach(d => {
                const axis = getAxis(d);
                const nx = cx + axis.x;
                const ny = cy + axis.y;
                const dist = (nx - tx) ** 2 + (ny - ty) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    bestDir = d;
                }
            });
            
            ghost.nextDir = bestDir;
        }
    }
  };

  const update = () => {
    if (!state.current || !state.current.active) return;
    if (state.current.paused || state.current.gameOver || state.current.gameWon) return;

    state.current.frameCount++;
    const { pacman, ghosts, grid } = state.current;

    // AI First, then Move
    ghosts.forEach(g => {
        aiGhost(g, grid, pacman);
        moveEntity(g, grid, true);
    });

    moveEntity(pacman, grid);

    const px = Math.round(pacman.x);
    const py = Math.round(pacman.y);
    
    // Interactions (Loose collision for pickups to feel responsive)
    if (grid[py] && grid[py][px] === TileType.PELLET && Math.abs(pacman.x - px) < 0.5 && Math.abs(pacman.y - py) < 0.5) {
      grid[py][px] = TileType.EMPTY;
      state.current.score += 10;
      setScore(state.current.score);
      soundService.playWaka();
      
      let remaining = 0;
      grid.forEach(row => row.forEach(c => { if (c === TileType.PELLET || c === TileType.POWER_PELLET) remaining++; }));
      if (remaining === 0) {
        state.current.gameWon = true;
        // Special message for level 3 (final level)
        if (state.current.level >= 3) {
          setGameStateLabel("YOU'VE MASTERED VIM MOTION!\nNOW GO USE VIM!");
        } else {
          setGameStateLabel("LEVEL COMPLETE!");
        }
        soundService.playStart();
      }
    } else if (grid[py] && grid[py][px] === TileType.POWER_PELLET && Math.abs(pacman.x - px) < 0.5 && Math.abs(pacman.y - py) < 0.5) {
      grid[py][px] = TileType.EMPTY;
      state.current.score += 50;
      setScore(state.current.score);
      ghosts.forEach(g => {
        if (g.mode !== 'EATEN') {
           g.mode = 'FRIGHTENED';
           g.scaredTimer = 1000; // Increased time for larger maze
           g.speed = FRIGHTENED_SPEED;
           // Reverse
           const opp = g.dir === 'UP' ? 'DOWN' : g.dir === 'DOWN' ? 'UP' : g.dir === 'LEFT' ? 'RIGHT' : 'LEFT';
           g.nextDir = opp;
           g.dir = opp;
        }
      });
    }

    // Ghost Logic
    ghosts.forEach(g => {
      if (g.mode === 'FRIGHTENED') {
        g.scaredTimer--;
        if (g.scaredTimer <= 0) {
          g.mode = 'CHASE';
          g.speed = BASE_SPEED * getLevelConfig(state.current!.level).speedMulti * 0.85;
          // Snap
          g.x = Math.round(g.x); 
          g.y = Math.round(g.y);
        }
      } else if (g.mode === 'EATEN') {
         // Ghost home center
         const homeX = 14;
         const homeY = 14;
         
         // Reached home, revive and exit again
         if (Math.abs(g.x - homeX) < 1.0 && Math.abs(g.y - homeY) < 1.0) {
             const currentLevel = state.current!.level;
             g.mode = currentLevel >= 3 ? 'CHASE' : 'SCATTER';
             g.speed = BASE_SPEED * getLevelConfig(currentLevel).speedMulti * 0.85;
             g.exitingHome = true; // Always exit home after respawn
             g.pathToHome = undefined; // Clear path
             g.pathIndex = undefined; // Clear path index
             g.lastPathCell = undefined; // Clear last cell tracker
             g.x = homeX;
             g.y = homeY;
             g.dir = 'UP'; // Will navigate out
             g.nextDir = 'UP';
         }
         // Keep normal speed for EATEN mode (same as alive)
      }
    });

    // Collision
    for (const g of ghosts) {
      const dx = g.x - pacman.x;
      const dy = g.y - pacman.y;
      if (Math.sqrt(dx*dx + dy*dy) < 0.6) {
        if (g.mode === 'FRIGHTENED') {
           g.mode = 'EATEN';
           // Keep normal speed (same as alive, not faster)
           g.speed = BASE_SPEED * getLevelConfig(state.current!.level).speedMulti * 0.85;
           // Reset path so it will be recalculated once
           g.pathToHome = undefined;
           g.pathIndex = undefined;
           g.lastPathCell = undefined;
           state.current.score += 200;
           setScore(state.current.score);
           soundService.playEatGhost();
        } else if (g.mode === 'CHASE' || g.mode === 'SCATTER') {
           // God mode: just teleport, don't lose life
           if (godMode) {
             const { pacmanStart } = parseMap();
             pacman.x = pacmanStart.x;
             pacman.y = pacmanStart.y;
             pacman.dir = 'NONE';
             pacman.nextDir = 'NONE';
             return; // Don't process further
           }
           
           soundService.playDeath();
           state.current.lives--;
           setLives(state.current.lives);
           if (state.current.lives <= 0) {
             state.current.gameOver = true;
             setGameStateLabel("GAME OVER");
           } else {
             // Soft Reset
             const { pacmanStart, ghostStarts } = parseMap();
             pacman.x = pacmanStart.x;
             pacman.y = pacmanStart.y;
             pacman.dir = 'NONE';
             pacman.nextDir = 'NONE';
             
             ghosts.forEach((ghost, i) => {
                 const currentLevel = state.current!.level;
                 ghost.x = ghostStarts[i].x;
                 ghost.y = ghostStarts[i].y;
                 // Restore programmed start for levels 1-2
                 const startDir = (i % 2 === 0 ? 'RIGHT' : 'LEFT');
                 ghost.dir = startDir;
                 ghost.nextDir = startDir;
                 ghost.mode = currentLevel >= 3 ? 'CHASE' : 'SCATTER'; // CHASE for level 3+
                 ghost.exitingHome = true; // Always exit home after respawn
             });
             
             state.current.paused = true;
             setTimeout(() => { if (state.current) state.current.paused = false; }, 1500);
           }
        }
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !state.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { grid, pacman, ghosts } = state.current;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mapWidth = grid[0].length * TILE_SIZE;
    const mapHeight = grid.length * TILE_SIZE;
    const offsetX = (canvas.width - mapWidth) / 2;
    const offsetY = (canvas.height - mapHeight) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    ctx.strokeStyle = '#1919A6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const type = grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const cx = px + TILE_SIZE/2;
        const cy = py + TILE_SIZE/2;

        if (type === TileType.WALL) {
           ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (type === TileType.PELLET) {
           ctx.fillStyle = '#FFB8ae';
           ctx.beginPath();
           ctx.arc(cx, cy, 2, 0, Math.PI * 2);
           ctx.fill();
        } else if (type === TileType.POWER_PELLET) {
           ctx.fillStyle = '#FFB8ae';
           if (state.current.frameCount % 20 < 10) {
             ctx.beginPath();
             ctx.arc(cx, cy, 6, 0, Math.PI * 2);
             ctx.fill();
           }
        } else if (type === TileType.GHOST_GATE) {
           ctx.strokeStyle = '#FFB8ae';
           ctx.beginPath();
           ctx.moveTo(px, cy);
           ctx.lineTo(px + TILE_SIZE, cy);
           ctx.stroke();
        }
      }
    }

    const pacX = pacman.x * TILE_SIZE + TILE_SIZE / 2;
    const pacY = pacman.y * TILE_SIZE + TILE_SIZE / 2;
    
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    
    let angle = 0;
    if (pacman.dir === 'UP') angle = -Math.PI/2;
    if (pacman.dir === 'DOWN') angle = Math.PI/2;
    if (pacman.dir === 'LEFT') angle = Math.PI;
    if (pacman.dir === 'RIGHT') angle = 0;

    const mouthOpen = (Math.sin(state.current.frameCount * 0.5) + 1) * 0.2;
    
    ctx.arc(pacX, pacY, TILE_SIZE/2 - 2, angle + mouthOpen, angle + 2*Math.PI - mouthOpen);
    ctx.lineTo(pacX, pacY);
    ctx.fill();

    ghosts.forEach(g => {
      const gx = g.x * TILE_SIZE + TILE_SIZE / 2;
      const gy = g.y * TILE_SIZE + TILE_SIZE / 2;
      
      if (g.mode === 'EATEN') {
         ctx.fillStyle = 'rgba(0,0,0,0)'; 
      } else {
        ctx.fillStyle = g.mode === 'FRIGHTENED' 
            ? (g.scaredTimer < 120 && Math.floor(state.current!.frameCount / 10) % 2 === 0 ? '#FFFFFF' : '#0000FF') 
            : g.color;
        
        ctx.beginPath();
        ctx.arc(gx, gy - 2, TILE_SIZE/2 - 2, Math.PI, 0);
        ctx.lineTo(gx + TILE_SIZE/2 - 2, gy + TILE_SIZE/2 - 2);
        
        const f = 3; 
        for(let i=1; i<=f; i++) {
            ctx.lineTo(gx + TILE_SIZE/2 - 2 - (TILE_SIZE-4)/f * i, gy + TILE_SIZE/2 - (i%2==0 ? 2 : 6));
        }
        ctx.lineTo(gx - TILE_SIZE/2 + 2, gy - 2);
        ctx.fill();
      }

      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
      ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      let offX = 0, offY = 0;
      if (g.dir === 'LEFT') offX = -1;
      if (g.dir === 'RIGHT') offX = 1;
      if (g.dir === 'UP') offY = -1;
      if (g.dir === 'DOWN') offY = 1;

      ctx.beginPath();
      ctx.arc(gx - 4 + offX, gy - 4 + offY, 1.5, 0, Math.PI * 2);
      ctx.arc(gx + 4 + offX, gy - 4 + offY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const loop = () => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto px-2 flex flex-col items-center">
      {/* HUD */}
      <div className="w-full flex justify-between items-end mb-2 font-bold text-white px-4 border-b-2 border-blue-900 pb-1">
        <div className="flex flex-col">
          <span className="text-gray-400 text-[10px] mb-0.5">SCORE</span>
          <span className="text-yellow-400 text-lg tracking-widest">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-[10px] mb-0.5">LEVEL</span>
          <span className="text-white text-base">{level}</span>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] mb-0.5">LIVES</span>
            <div className="flex gap-1">
               {Array.from({length: Math.max(0, lives)}).map((_, i) => (
                   <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full" style={{clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%, 0% 100%, 0% 0%)', transform: 'rotate(-90deg)'}}></div>
               ))}
            </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative border-4 border-blue-900 rounded-lg shadow-[0_0_20px_rgba(30,64,175,0.6)] bg-black overflow-hidden cursor-pointer" onClick={!gameStarted ? handleStartGame : undefined}>
        <canvas 
          ref={canvasRef} 
          width={28 * TILE_SIZE} 
          height={31 * TILE_SIZE}
          className="block"
        />
        
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm flex-col gap-3 text-center">
             <div className="text-3xl text-yellow-400 animate-bounce tracking-widest font-black" style={{textShadow: '0 0 10px red'}}>CLICK TO<br/>START</div>
             <div className="text-blue-300 text-xs mt-1">INITIALIZES AUDIO & VIDEO</div>
          </div>
        )}

        {gameStarted && gameStateLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <h1 className="text-3xl text-yellow-400 animate-pulse tracking-widest font-black drop-shadow-lg text-center px-4" style={{textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'}}>{gameStateLabel}</h1>
          </div>
        )}
      </div>

      {/* Controls Help */}
      <div className="mt-4 flex gap-3 justify-center items-center text-gray-500 font-mono text-sm">
        {['H', 'J', 'K', 'L'].map((key) => (
            <button 
                key={key}
                onMouseDown={() => handleInput(key)} 
                onTouchStart={(e) => { e.preventDefault(); handleInput(key); }} 
                className="flex flex-col items-center active:scale-95 transition-transform cursor-pointer group"
            >
            <kbd className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded border-b-4 border-gray-900 text-white font-bold text-base group-hover:bg-gray-700 group-hover:border-gray-800 transition-colors">{key}</kbd>
            <div className="text-[9px] mt-0.5 font-bold">
                {key === 'H' ? 'LEFT' : key === 'J' ? 'DOWN' : key === 'K' ? 'UP' : 'RIGHT'}
            </div>
            </button>
        ))}
      </div>
      <div className="mt-2 flex flex-col items-center text-[10px] text-gray-600 gap-0.5">
        <p>[SPACE] Pause / Restart Game</p>
        <p>[R] Force Restart Level</p>
      </div>
    </div>
  );
};
