"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-in";
  className?: string;
};

export default function ScrollReveal({ children, animation = "fade-up", className = "" }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  const baseClass = "transition-all duration-[1200ms] ease-out";
  const animClass = isVisible
    ? "opacity-100 translate-y-0"
    : animation === "fade-up"
    ? "opacity-0 translate-y-12"
    : "opacity-0";

  return (
    <div ref={ref} className={`${baseClass} ${animClass} ${className}`}>
      {children}
    </div>
  );
}