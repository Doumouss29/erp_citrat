import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from "@/components/ui/skeleton";
import { Images, Upload, Download } from "lucide-react";
import HSEPageHeader, { hseBtnPrimary, hseBtnSecondary, hseIcon } from "@/components/hse/HSEPageHeader";
import PhotoCard from "@/components/hse/PhotoCard";
import PhotoAddModal from "@/components/hse/PhotoAddModal";
import { usePhotoGallery } from "@/hooks/usePhotoGallery";

export default function PhotoGallery() {
  const queryClient = useQueryClient();
  const { photos, isLoading, error } = usePhotoGallery();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportPhotosPDF', {
        photos: photos
      });
      
      // Create a blob from the PDF and trigger download
      const blob = new Blob([new Uint8Array(Object.values(response.data.pdfData))], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'galerie-hse.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Erreur lors de l'export : ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <HSEPageHeader
        backTo="/hse"
        title="Galerie photos"
        subtitle={`Photos des événements HSE • ${photos.length} photo${photos.length > 1 ? 's' : ''}`}
        actions={
          <>
            <button onClick={handleExportPDF} disabled={exporting || photos.length === 0} type="button" className={hseBtnSecondary}>
              <Download className={hseIcon} />
              <span className="hidden sm:inline">{exporting ? 'Export...' : 'Exporter en PDF'}</span>
              <span className="sm:hidden">{exporting ? '...' : 'PDF'}</span>
            </button>
            <button onClick={() => setAddModalOpen(true)} type="button" className={hseBtnPrimary}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter des photos</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Gallery */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p role="alert">La galerie est indisponible. Rechargez la page pour réessayer.</p>
        ) : photos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Images className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Aucune photo pour le moment</p>
            <p className="text-slate-400 text-sm mt-1">Ajoutez les photos des événements HSE avec le bouton « Ajouter des photos ».</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                onEdit={photo.can_edit ? setEditing : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Photo Modal */}
      {(addModalOpen || editing) && <PhotoAddModal open photo={editing} onClose={() => {
        setEditing(null);
        setAddModalOpen(false);
      }} onSave={async (data) => {
        const response = await base44.functions.invoke('hseGalleryPhoto', editing ? { ...data, action: 'edit', id: editing.id } : data);
        if (!response.data?.id) throw new Error('Enregistrement incomplet');
        await queryClient.invalidateQueries({ queryKey: ['photos'] });
        toast.success(editing ? 'Photo modifiée' : 'Photo ajoutée à la galerie');
      }} />}
    </div>
  );
}