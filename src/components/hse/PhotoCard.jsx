import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Edit, Eye } from "lucide-react";

export default function PhotoCard({ photo, index = 0, onView, onEdit }) {
  const imageUrl = photo.image_url || photo.url || '';
  const caption = photo.title || photo.caption || '';
  const description = photo.description || '';

  return (
    <Card className="overflow-hidden group">
      <div
        className="aspect-[4/3] bg-slate-100 cursor-pointer relative"
        onClick={() => onView?.(photo)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={caption || `Photo ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {photo.category || 'Photo'}
          </Badge>
          <div className="flex gap-1">
            {onEdit && <Button size="icon" variant="ghost" className="h-7 w-7"
              aria-label={`Modifier la photo : ${caption || index + 1}`} onClick={() => onEdit(photo)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>}
          </div>
        </div>
        {caption && (
          <p className="text-xs font-medium text-slate-700 line-clamp-1">{caption}</p>
        )}
        {description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{description}</p>
        )}
      </div>
    </Card>
  );
}