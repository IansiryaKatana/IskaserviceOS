import { useState, useEffect, useRef } from "react";

interface TypingTextProps {
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Show blinking cursor at the end. */
  cursor?: boolean;
  /** Start typing after mount (delay in ms). */
  delay?: number;
  className?: string;
}

/**
 * Types out the given text character by character (typewriter effect).
 */
export function TypingText({
  text,
  speed = 45,
  cursor = true,
  delay = 0,
  className = "",
}: TypingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [started, setStarted] = useState(delay <= 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
    if (displayedLength >= text.length) return;
    intervalRef.current = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev + 1 >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return text.length;
        }
        return prev + 1;
      });
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, delay, started, displayedLength]);

  // Reset when text changes (e.g. tenant change)
  useEffect(() => {
    setDisplayedLength(0);
    setStarted(delay <= 0);
  }, [text, delay]);

  const displayed = text.slice(0, displayedLength);

  return (
    <span className={className}>
      {displayed}
      {cursor && displayedLength < text.length && (
        <span className="inline-block w-0.5 animate-pulse bg-current align-baseline" aria-hidden />
      )}
    </span>
  );
}
