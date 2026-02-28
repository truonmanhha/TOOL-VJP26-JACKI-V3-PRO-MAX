
'use client';

import React, { useRef, useEffect } from 'react';
import './FireworksHighTech.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface FireworksHighTechProps {
  onComplete?: () => void;
}

const FireworksHighTech: React.FC<FireworksHighTechProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  const createFirework = (x: number, y: number) => {
    const count = 100;
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = Math.random() * 10 + 2;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        color,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Khởi tạo các phát bắn ban đầu
    const launch = () => {
      createFirework(
        Math.random() * canvas.width,
        Math.random() * canvas.height * 0.5 + 100
      );
    };

    const interval = setInterval(launch, 800);

    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Tạo hiệu ứng đuôi mờ
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter'; // Giúp các tia lửa sáng rực khi chồng lên nhau

      particles.current.forEach((p, i) => {
        p.vx *= 0.98; // Lực cản không khí
        p.vy *= 0.98;
        p.vy += 0.05; // Trọng lực
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        if (p.alpha <= 0) {
          particles.current.splice(i, 1);
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    // Tự động kết thúc sau 10 giây
    const timer = setTimeout(() => {
      clearInterval(interval);
      if (onComplete) onComplete();
    }, 10000);

    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(interval);
      clearTimeout(timer);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onComplete]);

  return (
    <div className="fireworks-container">
      <div className="cyber-scanner-overlay" />
      <canvas ref={canvasRef} className="fireworks-canvas" />
    </div>
  );
};

export default FireworksHighTech;
