import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function usePullToRefresh(onRefresh) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (isRefreshing || container.scrollTop !== 0) return;
      
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startYRef.current);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 100));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 60 && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh?.();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, pullDistance, onRefresh]);

  return { containerRef, isRefreshing, pullDistance };
}

export function PullToRefreshIndicator({ isRefreshing, pullDistance }) {
  const progress = Math.min(pullDistance / 60, 1);
  
  return (
    <div className="flex justify-center items-center pt-4 overflow-hidden">
      <div className={`transform transition-all duration-200 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${progress * 180}deg)` }}>
        <RefreshCw className="w-5 h-5 text-slate-400" />
      </div>
    </div>
  );
}