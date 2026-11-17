import React from 'react';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

export default function PhotosGallery({ photos = [] }) {
  const [selectedPhoto, setSelectedPhoto] = React.useState(null);

  if (!photos || photos.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-slate-500 font-semibold mb-4">PHOTOS</h3>
        <p className="text-slate-400 text-sm text-center py-8">Aucune photo disponible</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="text-slate-600 font-semibold mb-6">PHOTOS</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square rounded-lg border-2 border-slate-300 overflow-hidden hover:border-slate-400 cursor-pointer transition-all hover:shadow-md"
            >
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">Photo ${index + 1}</div>`;
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Photo agrandie"
              className="max-w-full max-h-[80vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}