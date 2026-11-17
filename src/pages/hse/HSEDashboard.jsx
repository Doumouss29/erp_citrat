import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Plus,
  Bell,
} from "lucide-react";
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import HSEPageHeader, { hseBtnPrimary, hseBtnSecondary, hseIcon } from "@/components/hse/HSEPageHeader";

import StatsCards from "@/components/hse/StatsCards";
import EventCard from "@/components/hse/EventCard";
import EventDetail from "@/components/hse/EventDetail";
import Filters from "@/components/hse/Filters";
import EventForm from "@/components/hse/EventForm";
import AlertReportDialog from "@/components/hse/AlertReportDialog";
import { useHSEEvents } from "@/hooks/useHSEEvents";
import { useHSEFilters } from "@/hooks/useHSEFilters";
import { usePDFExport } from "@/hooks/usePDFExport";
import useHseRapportPerms from "@/hooks/useHseRapportPerms";
import { Link } from 'react-router-dom';

export default function HSEDashboard() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [alertReport, setAlertReport] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);


  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Bouton « Rapport » → espace des rapports trimestriels (Référent, Coordinateur, Chef de projet HSE, admin).
  const { data: rapportPerms } = useHseRapportPerms();
  const canReport = !!rapportPerms?.canView;

  const { events, isLoading, createMutation, updateMutation, deleteMutation } = useHSEEvents();
  const [linkedId, setLinkedId] = useState(() => new URLSearchParams(window.location.search).get('fiche'));
  useEffect(() => {
    if (!linkedId || isLoading) return;
    const match = events.find(e => e.id === linkedId);
    if (match) { setSelectedEvent(match); setDetailOpen(true); }
    else toast.error('Cette fiche est indisponible.');
    setLinkedId(null);
  }, [linkedId, events, isLoading]);
  const { filters, setFilters, filteredEvents, resetFilters } = useHSEFilters(events);
  const { exportSingleEvent } = usePDFExport();
  const [selection, setSelection] = useState(null);
  const [checked, setChecked] = useState([]);
  const [loadingReferents, setLoadingReferents] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  const nextFicheNumber = events.length > 0 ? Math.max(...events.map(e => e.fiche_number || 0)) + 1 : 1;

  const handleSendAlerts = async () => {
    if (!selectedEvent) {
      toast.info('Cliquez d\'abord sur une fiche pour la sélectionner, puis sur « Alertes ».');
      return;
    }

    setLoadingReferents(true);
    try {
      const { data } = await base44.functions.invoke('sendAlertToResponsables', { action: 'list', event_id: selectedEvent.id });
      setChecked([]);
      setSelection({ event: selectedEvent, referents: data.referents, requestId: crypto.randomUUID() });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Impossible de charger les référents.');
    } finally {
      setLoadingReferents(false);
    }
  };

  const confirmAlert = async () => {
    if (!selection || !checked.length || sendingAlert) return;
    setSendingAlert(true);
    try {
      const response = await base44.functions.invoke('sendAlertToResponsables', {
        action: 'send', event_id: selection.event.id, referent_ids: checked, request_id: selection.requestId
      });
      setSelection(null);
      if (Array.isArray(response.data.report)) setAlertReport({ reference: selection.event.reference, rows: response.data.report });
      else if (response.data.duplicate) toast.info(response.data.message);
      else toast.success(response.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Échec de l’envoi. Veuillez réessayer.");
    } finally {
      setSendingAlert(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  const handleNewEvent = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormOpen(true);
    setDetailOpen(false);
  };

  const handleSaveEvent = async (data) => {
    if (editingEvent) {
      await updateMutation.mutateAsync({ id: editingEvent.id, data });
      setFormOpen(false);
      setEditingEvent(null);
    } else {
      await createMutation.mutateAsync(data);
      setFormOpen(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la fiche N°${event.fiche_number} ?`)) {
      await deleteMutation.mutateAsync(event.id);
      setDetailOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleExportPDF = async (event) => {
    await exportSingleEvent(event);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <HSEPageHeader
        title="Registre HSE-PRESFOR"
        subtitle="Groupement CAG • Suivi des événements HSE"
        showPortal
      >
        {/* Galerie photos et Indicateurs sont dans le menu de l'application (barre latérale / onglets du bas). */}
        <button onClick={handleSendAlerts} disabled={loadingReferents || sendingAlert} type="button" className={`${hseBtnSecondary} ${canReport ? '' : 'col-span-2'}`}>
          <Bell className={hseIcon} />
          {loadingReferents ? 'Chargement…' : 'Alertes'}
        </button>
        {canReport && (
          <Link to="/hse/rapports" className={hseBtnSecondary}>
            <FileText className={hseIcon} />
            Rapports
          </Link>
        )}
        <button onClick={handleNewEvent} type="button" className={`${hseBtnPrimary} col-span-2 order-first md:order-last md:ml-1`}>
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Nouvelle fiche
        </button>
      </HSEPageHeader>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mb-8">
            <StatsCards events={filteredEvents} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <Filters 
            filters={filters} 
            setFilters={setFilters} 
            onReset={resetFilters}
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{filteredEvents.length}</span> fiche(s) trouvée(s)
          </p>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Aucune fiche trouvée</p>
            <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres pour voir plus de résultats</p>
            <Button variant="outline" onClick={resetFilters} className="mt-4">
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard event={event} onSelect={handleSelectEvent} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Event Detail Sheet */}
      <EventDetail 
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onExportPDF={handleExportPDF}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Event Form Dialog */}
      <EventForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        event={editingEvent}
        nextFicheNumber={nextFicheNumber}
      />
      <Dialog open={!!selection} onOpenChange={open => { if (!open && !sendingAlert) setSelection(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Destinataires de l’alerte</DialogTitle>
            <DialogDescription>Fiche {selection?.event.reference || 'HSE'} · Cochez les référents à prévenir.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto space-y-2">
            {selection?.referents.length === 0 && <p>Aucun référent actif et habilité pour cette alerte.</p>}
            {selection?.referents.map(r => (
              <label key={r.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                <input type="checkbox" disabled={sendingAlert} checked={checked.includes(r.id)}
                  onChange={e => { const on = e.target.checked; setChecked(ids => on ? [...ids, r.id] : ids.filter(id => id !== r.id)); }} />
                <span><strong>{r.nom}</strong><br /><span className="text-sm text-slate-600">{r.profil}</span></span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={sendingAlert} onClick={() => setSelection(null)}>Annuler</Button>
            <Button disabled={!checked.length || sendingAlert} onClick={confirmAlert}>
              {sendingAlert ? 'Envoi…' : `Envoyer l’alerte (${checked.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertReportDialog report={alertReport} onClose={() => setAlertReport(null)} />
    </div>
  );
}