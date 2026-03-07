import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TypewriterMessageProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({ 
  text, 
  speed = 15,
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset when text changes completely (not just appended)
    if (!text.startsWith(textRef.current) && textRef.current !== text) {
      setDisplayedText('');
      indexRef.current = 0;
    }
    textRef.current = text;
    
    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      
      const deltaTime = time - lastTimeRef.current;
      
      if (deltaTime > speed) {
        if (indexRef.current < textRef.current.length) {
          // Add characters in chunks if lagging
          const charsToAdd = Math.max(1, Math.floor(deltaTime / speed));
          indexRef.current = Math.min(indexRef.current + charsToAdd, textRef.current.length);
          setDisplayedText(textRef.current.substring(0, indexRef.current));
          lastTimeRef.current = time;
        } else {
          if (onComplete) onComplete();
          return; // Stop animation
        }
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {displayedText.length < text.length && (
        <motion.span 
          animate={{ opacity: [1, 0] }} 
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

export default TypewriterMessage;
