import { useState, useEffect, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

function App() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const directionRef = useRef<Direction>(direction);
  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update direction ref
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Generate food
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    return newFood;
  }, []);

  // Draw game
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = GRID_SIZE * CELL_SIZE;
    const height = GRID_SIZE * CELL_SIZE;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food with glow effect
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const progress = index / snake.length;
      
      if (isHead) {
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#4ecdc4';
      } else {
        ctx.shadowBlur = 0;
        const r = Math.round(78 - progress * 30);
        const g = Math.round(205 - progress * 80);
        const b = Math.round(196 - progress * 60);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      }

      const padding = isHead ? 1 : 2;
      const radius = isHead ? 5 : 3;
      
      // Rounded rectangle
      const x = segment.x * CELL_SIZE + padding;
      const y = segment.y * CELL_SIZE + padding;
      const w = CELL_SIZE - padding * 2;
      const h = CELL_SIZE - padding * 2;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Draw eyes on head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a1a2e';
        const eyeSize = 3;
        let eye1X = 0, eye1Y = 0, eye2X = 0, eye2Y = 0;
        
        switch (directionRef.current) {
          case 'RIGHT':
            eye1X = x + w - 6; eye1Y = y + 5;
            eye2X = x + w - 6; eye2Y = y + h - 5;
            break;
          case 'LEFT':
            eye1X = x + 6; eye1Y = y + 5;
            eye2X = x + 6; eye2Y = y + h - 5;
            break;
          case 'UP':
            eye1X = x + 5; eye1Y = y + 6;
            eye2X = x + w - 5; eye2Y = y + 6;
            break;
          case 'DOWN':
            eye1X = x + 5; eye1Y = y + h - 6;
            eye2X = x + w - 5; eye2Y = y + h - 6;
            break;
        }
        
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.shadowBlur = 0;
  }, [snake, food]);

  // Game loop
  const gameStep = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      const dir = directionRef.current;

      switch (dir) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snakeHighScore', newScore.toString());
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameOver, isPaused, food, generateFood, highScore]);

  // Game loop interval
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = window.setInterval(gameStep, speed);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, gameStep, speed]);

  // Draw on every state change
  useEffect(() => {
    drawGame();
  }, [drawGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) {
        if (e.key === ' ' || e.key === 'Enter') {
          startGame();
          return;
        }
      }

      if (e.key === ' ' && gameStarted && !gameOver) {
        setIsPaused(prev => !prev);
        return;
      }

      if (gameOver && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
        return;
      }

      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver]);

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return;

    const dir = directionRef.current;
    if (absDx > absDy) {
      if (dx > 0 && dir !== 'LEFT') setDirection('RIGHT');
      else if (dx < 0 && dir !== 'RIGHT') setDirection('LEFT');
    } else {
      if (dy > 0 && dir !== 'UP') setDirection('DOWN');
      else if (dy < 0 && dir !== 'DOWN') setDirection('UP');
    }
    
    touchStartRef.current = null;
  };

  const startGame = () => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setGameStarted(true);
    setSpeed(INITIAL_SPEED);
  };

  const canvasWidth = GRID_SIZE * CELL_SIZE;
  const canvasHeight = GRID_SIZE * CELL_SIZE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-6">
        🐍 Змейка
      </h1>

      {/* Score Board */}
      <div className="flex gap-6 mb-4">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-5 py-2 border border-gray-700/50">
          <span className="text-gray-400 text-sm">Очки</span>
          <p className="text-2xl font-bold text-green-400">{score}</p>
        </div>
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-5 py-2 border border-gray-700/50">
          <span className="text-gray-400 text-sm">Рекорд</span>
          <p className="text-2xl font-bold text-yellow-400">{highScore}</p>
        </div>
      </div>

      {/* Game Canvas */}
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl shadow-purple-500/20 border-2 border-gray-700/50"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block"
        />

        {/* Start Screen Overlay */}
        {!gameStarted && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">🐍</div>
            <h2 className="text-2xl font-bold text-white mb-2">Змейка</h2>
            <p className="text-gray-300 text-sm mb-6 text-center px-4">
              Управление: стрелки или WASD<br />
              Мобильные: свайпы по экрану
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold rounded-full hover:from-green-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
            >
              Начать игру
            </button>
            <p className="text-gray-500 text-xs mt-3">или нажмите Пробел / Enter</p>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-5xl mb-3">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Пауза</h2>
            <button
              onClick={() => setIsPaused(false)}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full hover:from-blue-400 hover:to-purple-400 transition-all"
            >
              Продолжить
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-5xl mb-3">💀</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Игра окончена!</h2>
            <p className="text-gray-300 text-lg mb-1">Очки: <span className="text-green-400 font-bold">{score}</span></p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-400 text-sm mb-3 animate-pulse">🏆 Новый рекорд!</p>
            )}
            <button
              onClick={startGame}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-full hover:from-red-400 hover:to-pink-400 transition-all transform hover:scale-105 shadow-lg shadow-red-500/30"
            >
              Играть снова
            </button>
            <p className="text-gray-500 text-xs mt-3">или нажмите Пробел / Enter</p>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="mt-6 md:hidden">
        <div className="grid grid-cols-3 gap-2 w-40 mx-auto">
          <div></div>
          <button
            onTouchStart={() => { if (directionRef.current !== 'DOWN') setDirection('UP'); }}
            className="bg-gray-800/80 border border-gray-600 rounded-lg p-3 text-white text-xl active:bg-gray-700 flex items-center justify-center"
          >
            ↑
          </button>
          <div></div>
          <button
            onTouchStart={() => { if (directionRef.current !== 'RIGHT') setDirection('LEFT'); }}
            className="bg-gray-800/80 border border-gray-600 rounded-lg p-3 text-white text-xl active:bg-gray-700 flex items-center justify-center"
          >
            ←
          </button>
          <button
            onTouchStart={() => { if (gameStarted && !gameOver) setIsPaused(prev => !prev); }}
            className="bg-gray-800/80 border border-gray-600 rounded-lg p-3 text-white text-sm active:bg-gray-700 flex items-center justify-center"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <button
            onTouchStart={() => { if (directionRef.current !== 'LEFT') setDirection('RIGHT'); }}
            className="bg-gray-800/80 border border-gray-600 rounded-lg p-3 text-white text-xl active:bg-gray-700 flex items-center justify-center"
          >
            →
          </button>
          <div></div>
          <button
            onTouchStart={() => { if (directionRef.current !== 'UP') setDirection('DOWN'); }}
            className="bg-gray-800/80 border border-gray-600 rounded-lg p-3 text-white text-xl active:bg-gray-700 flex items-center justify-center"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center text-gray-500 text-sm hidden md:block">
        <p>Стрелки / WASD — управление &nbsp;|&nbsp; Пробел — пауза</p>
      </div>
    </div>
  );
}

export default App;
