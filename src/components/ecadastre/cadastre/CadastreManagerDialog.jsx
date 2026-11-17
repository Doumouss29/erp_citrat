import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Loader2, FileJson, Trash2, Plus, MapPin, Download } from 'lucide-react';
import { toast } from 'sonner';
import CadastreUploadDialog from './CadastreUploadDialog';

/** Contenu de gestion des couches (sections GeoJSON par commune), sans fenêtre. */
export function CadastreManagerPanel({ organisation, active = true }) {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['cadastre', organisation?.id],
    queryFn: () => base44.entities.CadastreCommunal.filter({ organisation_id: organisation.id }),
    enabled: !!organisation?.id && active,
  });
  return (
    <>
      <CadastreSectionsBody
        sections={sections}
        isLoading={isLoading}
        onImport={() => setIsUploadOpen(true)}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ['cadastre', organisation?.id] })}
      />
      <CadastreUploadDialog
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ['cadastre', organisation?.id] });
        }}
        organisation={organisation}
      />
    </>
  );
}

function CadastreSectionsBody({ sections, isLoading, onImport, onChanged }) {
  const handleDownload = async (section) => {
    try {
      const response = await fetch(section.geojson_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${section.commune}-${section.nom_section}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    }
  };
  const handleDelete = async (section) => {
    if (!confirm(`Supprimer la section "${section.nom_section}" (${section.commune}) ?`)) return;
    try {
      localStorage.removeItem(`cadastre_geojson_${section.id}`);
      await base44.entities.CadastreCommunal.delete(section.id);
      onChanged?.();
      toast.success('Section supprimée');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };
  const byCommune = sections.reduce((acc, s) => {
    if (!acc[s.commune]) acc[s.commune] = [];
    acc[s.commune].push(s);
    return acc;
  }, {});
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-slate-500">{sections.length} section{sections.length > 1 ? 's' : ''} importée{sections.length > 1 ? 's' : ''}</p>
        <Button className="bg-green-700 hover:bg-green-800 text-white rounded-xl" onClick={onImport}>
          <Plus className="w-4 h-4 mr-2" />
          Importer une section
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>
      ) : sections.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">
          <FileJson className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p>Aucune section cadastrale importée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCommune).map(([commune, secs]) => (
            <div key={commune}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-700" />
                <span className="font-semibold text-slate-800">{commune}</span>
                <span className="text-xs text-slate-500">({secs.length} section{secs.length > 1 ? 's' : ''})</span>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
                {secs.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between gap-2 p-2 pl-3 bg-slate-50 rounded-lg border">
                    <div className="min-w-0">
                      <span className="font-medium text-sm text-slate-800">{sec.nom_section}</span>
                      {sec.nombre_parcelles && <span className="ml-2 text-xs text-slate-500">{sec.nombre_parcelles} parcelles</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(sec)} title="Télécharger le GeoJSON"><Download className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(sec)} title="Supprimer"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CadastreManagerDialog({ isOpen, onClose, organisation }) {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['cadastre', organisation?.id],
    queryFn: () => base44.entities.CadastreCommunal.filter({ organisation_id: organisation.id }),
    enabled: !!organisation?.id && isOpen,
  });

  const handleDownload = async (section) => {
    try {
      const response = await fetch(section.geojson_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${section.commune}-${section.nom_section}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (section) => {
    if (!confirm(`Supprimer la section "${section.nom_section}" (${section.commune}) ?`)) return;
    try {
      // Vider le cache local
      localStorage.removeItem(`cadastre_geojson_${section.id}`);
      await base44.entities.CadastreCommunal.delete(section.id);
      queryClient.invalidateQueries({ queryKey: ['cadastre', organisation?.id] });
      toast.success('Section supprimée');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Grouper par commune
  const byCommune = sections.reduce((acc, s) => {
    if (!acc[s.commune]) acc[s.commune] = [];
    acc[s.commune].push(s);
    return acc;
  }, {});

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-green-700" />
              Couches cadastrales
            </DialogTitle>
            <DialogDescription>
              Sections cadastrales (GeoJSON) disponibles par commune
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-2">
            <Button
              className="bg-green-700 hover:bg-green-800 text-white"
              onClick={() => setIsUploadOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Importer une section
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-700" />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileJson className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>Aucune section cadastrale importée</p>
              <p className="text-sm mt-1">Cliquez sur "Importer une section" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(byCommune).map(([commune, secs]) => (
                <div key={commune}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-700" />
                    <span className="font-semibold text-slate-800">{commune}</span>
                    <span className="text-xs text-slate-500">({secs.length} section{secs.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-1 ml-6">
                    {secs.map(sec => (
                      <div key={sec.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                        <div>
                          <span className="font-medium text-sm text-slate-800">{sec.nom_section}</span>
                          {sec.nombre_parcelles && (
                            <span className="ml-2 text-xs text-slate-500">{sec.nombre_parcelles} parcelles</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(sec)}
                            title="Télécharger le GeoJSON"
                          >
                            <Download className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sec)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CadastreUploadDialog
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ['cadastre', organisation?.id] });
        }}
        organisation={organisation}
      />
    </>
  );
}