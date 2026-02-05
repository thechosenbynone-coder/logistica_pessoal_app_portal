import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "./ui.js";

const DIRECTIONS = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  active = false,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState("TOP");

  const rotateDirection = (current) => {
    const currentIndex = DIRECTIONS.indexOf(current);
    const nextIndex = clockwise
      ? (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length
      : (currentIndex + 1) % DIRECTIONS.length;
    return DIRECTIONS[nextIndex];
  };

  const movingMap = useMemo(
    () => ({
      TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
      LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
      BOTTOM:
        "radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
      RIGHT:
        "radial-gradient(16.2% 41.2% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
    }),
    []
  );

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (!hovered && !active) {
      const interval = setInterval(() => {
        setDirection((prev) => rotateDirection(prev));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, active, duration, clockwise]);

  const showHighlight = active || hovered;

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex rounded-2xl border border-slate-200/70 bg-white/60 hover:bg-white transition duration-300 items-center justify-center overflow-visible p-px w-full",
        containerClassName
      )}
      {...props}
    >
      <div className={cn("relative z-10 w-full rounded-[inherit]", className)}>
        {children}
      </div>

      <motion.div
        className="absolute inset-0 z-0 rounded-[inherit]"
        style={{ filter: "blur(2px)" }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: showHighlight
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />

      <div className="absolute inset-[2px] z-[1] rounded-[inherit] bg-white" />
    </Tag>
  );
}
