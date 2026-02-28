
import React, { useEffect, useRef } from 'react';

const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const columns = Math.floor(width / 20);
    const drops: number[] = new Array(columns).fill(1);
    
    // Characters: Mix of Katakana, Numbers, and CNC codes
    const chars = '01ABCDEFXYZG01G00M03M05$#@%&*ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ'.split('');

    const draw = () => {
      // Slightly lighter background for trail effect
      ctx.fillStyle = 'rgba(15, 20, 25, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#0ea5e9'; // Blue-500 hex
      ctx.font = 'bold 16px "JetBrains Mono"'; // Bolder font

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 20;
        const y = drops[i] * 20;

        // Randomly highlight some characters white
        if (Math.random() > 0.98) {
             ctx.fillStyle = '#ffffff';
        } else {
             ctx.fillStyle = '#0ea5e9';
        }

        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.4 }} // Increased opacity for better visibility
    />
  );
};

export default MatrixBackground;
