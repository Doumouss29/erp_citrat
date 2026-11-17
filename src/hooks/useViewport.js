import { useState, useEffect } from "react";

// Returns 'mobile' | 'tablet' | 'desktop' based on window width.
// mobile: < 768px, tablet: 768–1023px, desktop: >= 1024px
export function useViewport() {
  const getBreakpoint = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  };

  const [viewport, setViewport] = useState(getBreakpoint);

  useEffect(() => {
    const onResize = () => setViewport(getBreakpoint());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return viewport;
}

export default useViewport;