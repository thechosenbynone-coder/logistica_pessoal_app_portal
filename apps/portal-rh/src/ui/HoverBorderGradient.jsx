import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../ui/ui.js';

const DIRECTIONS = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];

function rotateDirection(currentDirection, clockwise) {
  const currentIndex = DIRECTIONS.indexOf(currentDirection);
  const nextIndex = clockwise
    ? (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length
    : (currentIndex + 1) % DIRECTIONS.length;
  return DIRECTIONS[nextIndex];
}

export default function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  duration = 1,
  clockwise = true,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState('TOP');

  const movingMap = useMemo(
    () => ({
      TOP: 'radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
      LEFT: 'radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
      BOTTOM: 'radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
      RIGHT:
        'radial-gradient(16.2% 41.2% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)'
    }),
    []
  );

  const highlight =
    'radial-gradient(75% 181.15% at 50% 50%, rgba(37, 99, 235, 0.7) 0%, rgba(255, 255, 255, 0) 100%)';

  useEffect(() => {
    if (hovered) return undefined;
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState, clockwise));
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [clockwise, duration, hovered]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex w-fit overflow-hidden rounded-full border border-slate-200 bg-white/90 p-px transition duration-300',
        containerClassName
      )}
      {...props}
    >
      <div className={cn('relative z-10 rounded-[inherit] bg-white px-3 py-1.5 text-slate-700', className)}>{children}</div>
      <motion.div
        className="absolute inset-0 z-0 rounded-[inherit]"
        style={{ filter: 'blur(2px)' }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered ? [movingMap[direction], highlight] : movingMap[direction]
        }}
        transition={{ ease: 'linear', duration: duration || 1 }}
      />
      <div className="absolute inset-[2px] z-[1] rounded-full bg-white" />
    </Tag>
  );
}
