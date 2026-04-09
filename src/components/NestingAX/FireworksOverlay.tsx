import React, { useEffect, useRef, useState } from 'react';
import './FireworksOverlay.css';

interface FireworksProps {
  onClose: () => void;
  duration?: number; // default 20s
}

// ============================================================
// Particle class for fireworks
// ============================================================
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number = 0;
  ay: number = 0.2; // gravity
  life: number = 1; // 0-1, alpha
  decay: number = 0.015;
  size: number = 2;
  color: string;
  trail: Array<{ x: number; y: number }> = [];
  maxTrailLength: number = 5;

  constructor(x: number, y: number, vx: number, vy: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
  }

  update() {
    // Store position for trail
    if (this.trail.length === 0 || this.trail[this.trail.length - 1].x !== this.x) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    }

    // Apply forces
    this.vx += this.ax;
    this.vy += this.ay;

    // Damping
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Decay
    this.life -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;

    const alpha = Math.max(0, this.life);

    // Draw trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha * 0.3})`);
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();
    }

    // Draw particle
    ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isAlive(): boolean {
    return this.life > 0;
  }
}

// ============================================================
// Fireworks Explosion
// ============================================================
class Explosion {
  x: number;
  y: number;
  particles: Particle[] = [];
  colors = [
    'rgb(255, 0, 77)',    // red
    'rgb(255, 193, 7)',   // gold
    'rgb(33, 150, 243)',  // blue
    'rgb(76, 175, 80)',   // green
    'rgb(233, 30, 99)',   // pink
    'rgb(156, 39, 176)',  // purple
    'rgb(255, 87, 34)',   // deep-orange
    'rgb(0, 188, 212)',   // cyan
  ];

  constructor(x: number, y: number, particleCount: number = 100) {
    this.x = x;
    this.y = y;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 3 + Math.random() * 8;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const size = 1 + Math.random() * 4;

      const particle = new Particle(x, y, vx, vy, color);
      particle.size = size;
      particle.decay = 0.01 + Math.random() * 0.02;
      this.particles.push(particle);
    }
  }

  update() {
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.isAlive());
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => p.draw(ctx));
  }

  isAlive(): boolean {
    return this.particles.length > 0;
  }
}

// ============================================================
// Main Fireworks Engine
// ============================================================
class FireworksEngine {
  canvas: HTMLCanvasElement;
  trailsCanvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  trailsCtx: CanvasRenderingContext2D;
  explosions: Explosion[] = [];
  width: number;
  height: number;
  animationFrameId: number | null = null;
  isRunning: boolean = true;

  constructor(
    canvasId: string,
    trailsCanvasId: string,
    width: number,
    height: number
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.trailsCanvas = document.getElementById(trailsCanvasId) as HTMLCanvasElement;

    if (!this.canvas || !this.trailsCanvas) {
      throw new Error('Canvas elements not found');
    }

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.trailsCtx = this.trailsCanvas.getContext('2d') as CanvasRenderingContext2D;

    this.width = width;
    this.height = height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.trailsCanvas.width = width;
    this.trailsCanvas.height = height;

    // Setup context properties
    this.ctx.imageSmoothingEnabled = true;
    this.trailsCtx.imageSmoothingEnabled = true;
  }

  createExplosion(x: number, y: number, particleCount?: number) {
    const explosion = new Explosion(x, y, particleCount);
    this.explosions.push(explosion);
  }

  createRandomExplosion() {
    const x = Math.random() * this.width;
    const y = Math.random() * (this.height * 0.7); // Top 70% of screen
    this.createExplosion(x, y, 80 + Math.floor(Math.random() * 50));
  }

  update() {
    this.explosions.forEach(e => e.update());
    this.explosions = this.explosions.filter(e => e.isAlive());
  }

  draw() {
    // Clear main canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw explosions on trails canvas (for glow effect)
    this.trailsCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.trailsCtx.fillRect(0, 0, this.width, this.height);

    // Draw particles
    this.explosions.forEach(e => {
      e.draw(this.ctx);
      // Optionally draw light trails on separate canvas
      e.particles.forEach(p => {
        if (p.trail.length > 0) {
          this.trailsCtx.shadowColor = p.color;
          this.trailsCtx.shadowBlur = 10;
          const lastPoint = p.trail[p.trail.length - 1];
          this.trailsCtx.fillStyle = p.color.replace('rgb', 'rgba').replace(')', `, ${p.life * 0.1})`);
          this.trailsCtx.fillRect(lastPoint.x - 2, lastPoint.y - 2, 4, 4);
        }
      });
    });
  }

  animate() {
    if (!this.isRunning) return;

    this.update();
    this.draw();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  destroy() {
    this.stop();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.trailsCtx.clearRect(0, 0, this.width, this.height);
  }
}

// ============================================================
// React Component
// ============================================================
export const FireworksOverlay: React.FC<FireworksProps> = ({ onClose, duration = 20000 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FireworksEngine | null>(null);
  const explosionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    // Get container dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    try {
      // Initialize fireworks engine
      const engine = new FireworksEngine('main-canvas', 'trails-canvas', width, height);
      engineRef.current = engine;
      engine.start();

      // Create explosions at random intervals
      explosionIntervalRef.current = setInterval(() => {
        if (engine && engine.isRunning) {
          engine.createRandomExplosion();
        }
      }, 400); // New explosion every 400ms

      // Timer to auto-close
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (explosionIntervalRef.current) {
              clearInterval(explosionIntervalRef.current);
            }
            if (engineRef.current) {
              engineRef.current.destroy();
            }
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Handle window resize
      const handleResize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        if (engineRef.current) {
          engineRef.current.canvas.width = newWidth;
          engineRef.current.canvas.height = newHeight;
          engineRef.current.trailsCanvas.width = newWidth;
          engineRef.current.trailsCanvas.height = newHeight;
          engineRef.current.width = newWidth;
          engineRef.current.height = newHeight;
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        clearInterval(timer);
        if (explosionIntervalRef.current) {
          clearInterval(explosionIntervalRef.current);
        }
        if (engineRef.current) {
          engineRef.current.destroy();
        }
      };
    } catch (error) {
      console.error('[FireworksOverlay] Error initializing fireworks:', error);
      onClose();
    }
  }, [onClose]);

  const handleCloseNow = () => {
    if (explosionIntervalRef.current) {
      clearInterval(explosionIntervalRef.current);
    }
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    onClose();
  };

  return (
    <div className="fireworks-overlay fixed inset-0 z-[9999] bg-black">
      <div className="absolute top-4 right-4 z-50 text-white font-bold text-xl">
        Closing in {timeLeft}s
        <button
          onClick={handleCloseNow}
          className="ml-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
        >
          Close Now
        </button>
      </div>
      <div ref={containerRef} id="fireworks-stage" className="w-full h-full">
        <div className="canvas-container w-full h-full relative">
          <canvas id="trails-canvas" className="absolute mix-blend-lighten w-full h-full"></canvas>
          <canvas id="main-canvas" className="absolute mix-blend-lighten w-full h-full"></canvas>
        </div>
      </div>
      {/* SVG Spritesheet (for potential future use) */}
      <div style={{ height: 0, width: 0, position: 'absolute', visibility: 'hidden' }}>
        <svg xmlns="http://www.w3.org/2000/svg">
          <symbol id="icon-play" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </symbol>
          <symbol id="icon-pause" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </symbol>
          <symbol id="icon-close" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </symbol>
        </svg>
      </div>
    </div>
  );
};
