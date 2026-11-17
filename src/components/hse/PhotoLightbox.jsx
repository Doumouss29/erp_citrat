import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function PhotoLightbox({ photos = [], index, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(index);

  useEffect(() => {
    setCurrentIndex(index);
  }, [index]);

  if (!photos || photos.length === 0) return null;

  const photo = photos[currentIndex];

  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-slate-300 z-10"
      >
        <X className="w-8 h-8" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 text-white hover:text-slate-300 p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 text-white hover:text-slate-300 p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="max-w-4xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="max-w-full max-h-[75vh] rounded-lg"
        />
        {photo.caption && (
          <p className="text-white text-sm mt-4 text-center max-w-2xl">
            {photo.caption}
          </p>
        )}
        <p className="text-slate-400 text-xs mt-2">
          {currentIndex + 1} / {photos.length}
        </p>
      </div>
    </div>
  );
}