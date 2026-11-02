import { useEffect, useRef } from "react";
/** Reserve the measured mobile navigation height, including text enlargement. */
export function useNavigationClearance() {
  const shellRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      shellRef.current?.style.setProperty(
        "--login-nav-height",
        `${entry.target.getBoundingClientRect().height}px`,
      );
    });
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, []);
  return { shellRef, navRef };
}
