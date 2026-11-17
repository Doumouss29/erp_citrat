import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 80;
const MAX_PULL = 150;

// La page peut défiler dans la fenêtre ou dans un bloc parent : on ne tire que si tout est en haut.
function isAtTop(element) {
  if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) return false;
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    if (node.scrollTop > 0) return false;
  }
  return true;
}

/** Tirer vers le bas pour actualiser (écrans tactiles uniquement ; sans effet à la souris). */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let startX = 0;
    let startY = 0;
    let armed = false;
    let pulling = false;
    let distance = 0;
    let refreshing = false;

    const reset = () => {
      armed = false;
      pulling = false;
      distance = 0;
      setPullDistance(0);
    };

    const handleTouchStart = (e) => {
      if (refreshing || e.touches.length !== 1) { armed = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      armed = isAtTop(e.target);
      pulling = false;
      distance = 0;
    };

    const handleTouchMove = (e) => {
      if (!armed || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      if (!pulling) {
        // Geste vers le haut ou horizontal (tableau qui défile) : on laisse le navigateur faire.
        if (deltaY < -4 || Math.abs(deltaX) > Math.abs(deltaY)) { armed = false; return; }
        if (deltaY <= 10) return;
        pulling = true;
      }
      if (e.cancelable) e.preventDefault();
      distance = Math.max(0, Math.min(deltaY, MAX_PULL));
      setPullDistance(distance);
    };

    const handleTouchEnd = async () => {
      const shouldRefresh = pulling && distance >= PULL_THRESHOLD && !refreshing;
      reset();
      if (!shouldRefresh) return;
      refreshing = true;
      setIsRefreshing(true);
      try {
        await onRefreshRef.current?.();
      } catch (error) {
        console.error('Actualisation impossible', error);
      } finally {
        refreshing = false;
        setIsRefreshing(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', reset);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', reset);
    };
  }, []);

  const active = pullDistance > 0 || isRefreshing;
  const ready = pullDistance >= PULL_THRESHOLD || isRefreshing;
  const offset = isRefreshing ? 28 : pullDistance * 0.35;

  return (
    <div ref={containerRef} className="relative">
      {active && (
        <div
          className="absolute top-0 inset-x-0 flex justify-center z-20 pointer-events-none"
          style={{ transform: `translateY(${offset - 28}px)` }}
          role={isRefreshing ? 'status' : undefined}
          aria-label={isRefreshing ? 'Actualisation en cours' : undefined}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow ring-1 ring-border">
            <RefreshCw
              className={`w-5 h-5 ${ready ? 'text-primary' : 'text-muted-foreground'} ${isRefreshing ? 'animate-spin' : ''}`}
              style={isRefreshing ? undefined : { transform: `rotate(${pullDistance * 2}deg)` }}
            />
          </span>
        </div>
      )}
      <div style={pullDistance > 0 || isRefreshing ? { transform: `translateY(${offset}px)` } : undefined}>
        {children}
      </div>
    </div>
  );
}
