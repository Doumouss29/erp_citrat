import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getTicketOwner } from '@/lib/assistanceAssign';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APPLICATIONS, REQUEST_TYPES, generateTicketNumber } from '@/lib/assistanceConstants';
import { APP_LOGOS } from '@/lib/assistanceAppVisuals';
import { APP_DEFS, isRemovedApp } from '@/lib/cgesnData';
import { Upload, Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CreateTicket() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    application: '',
    request_type: '',
    priority: 'moyenne',
    requester_name: user?.full_name || '',
    requester_email: user?.email || '',
  });
  const [attachment, setAttachment] = useState(null);

  // Pré-remplit nom/email quand l'utilisateur est chargé après l'affichage
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      requester_name: f.requester_name || user.full_name || '',
      requester_email: f.requester_email || user.email || '',
    }));
  }, [user]);

  // Toutes les applications du portail : celles connues + celles ajoutées dans l'administration
  const { data: portalApps = [] } = useQuery({
    queryKey: ['portal-apps'],
    queryFn: async () => { try { const r = await base44.entities.PortalApp.list(); return Array.isArray(r) ? r : (r?.items || []); } catch { return []; } },
    staleTime: 10 * 60 * 1000,
  });
  const pickerApps = useMemo(() => {
    // L'application Assistance n'est pas proposée : on est déjà dans l'assistance
    const known = APPLICATIONS.filter((a) => a.id !== 'assistance').map((a) => {
      const entry = portalApps.find((p) => p.app_id === a.portalId);
      const def = APP_DEFS.find((d) => d.id === a.portalId);
      return { id: a.id, label: a.label, logo: entry?.icon || APP_LOGOS[a.id], color: def?.color || (/^#[0-9a-f]{6}$/i.test(entry?.color || '') ? entry.color : undefined), tint: def?.badgeBg };
    });
    const knownPortalIds = new Set([...APPLICATIONS.map((a) => a.portalId), ...APP_DEFS.map((d) => d.id)]);
    const custom = portalApps
      .filter((p) => p.app_id && !knownPortalIds.has(p.app_id) && !isRemovedApp(p.app_id))
      .map((p) => ({ id: p.app_id, label: (p.name || p.app_id).toLowerCase(), logo: p.icon, color: /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : undefined }));
    return [...known, ...custom];
  }, [portalApps]);

  // Thème du formulaire = couleur de l'application choisie
  const selectedApp = pickerApps.find((a) => a.id === form.application);
  const themeColor = selectedApp?.color || (selectedApp ? '#1e293b' : null);
  const themeTint = selectedApp?.tint || (themeColor ? `${themeColor}14` : null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ticketNumber = generateTicketNumber();

      // Assignation automatique au super administrateur
      const owner = await getTicketOwner();
      const assignedTo = owner?.email || null;
      const assignedToName = owner?.name || null;

      const ticket = await base44.entities.SiTicket.create({
        ...data,
        ticket_number: ticketNumber,
        status: assignedTo ? 'en_attente' : 'nouveau',
        assigned_to: assignedTo,
        assigned_to_name: assignedToName,
      });

      // Track or update requester
      try {
        const existing = await base44.entities.SiRequester.filter({ email: data.requester_email }, { limit: 1 });
        if (existing.length > 0) {
          await base44.entities.SiRequester.update(existing[0].id, {
            requests_count: (existing[0].requests_count || 1) + 1,
            last_request_date: new Date().toISOString(),
          });
        } else {
          await base44.entities.SiRequester.create({
            email: data.requester_email,
            name: data.requester_name,
            requests_count: 1,
            last_request_date: new Date().toISOString(),
          });
        }
      } catch (e) { /* non-blocking */ }

      return ticket;
    },
    onSuccess: async (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['si-tickets'] });
      toast.success('Ticket créé avec succès');
      // Envoyer email + notifications (non bloquant)
      try {
        await base44.functions.invoke('sendTicketEmail', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          title: form.title,
          application: form.application,
          priority: form.priority,
          requesterEmail: ticket.requester_email || user?.email || form.requester_email,
          requesterName: ticket.requester_name || user?.full_name || form.requester_name,
        });
      } catch (e) { /* non bloquant */ }
      navigate(`/assistance/ticket/${ticket.id}`);
    },
    onError: () => toast.error('Erreur lors de la création du ticket'),
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setAttachment({ url: file_url, name: file.name });
      toast.success('Fichier joint');
    } catch (e) {
      toast.error('Erreur lors du téléchargement du fichier');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.application || !form.request_type) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    // Les infos du demandeur viennent du compte connecté (visibles par l'admin dans le ticket)
    const requester_name = user?.full_name || form.requester_name;
    const requester_email = user?.email || form.requester_email;
    if (!requester_email) {
      toast.error('Veuillez renseigner votre email');
      return;
    }
    createMutation.mutate({ ...form, requester_name, requester_email, description: form.title, attachment_url: attachment?.url });
  };

  return (
    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl sm:text-2xl font-heading font-bold">Nouveau ticket</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Décrivez votre problème, un technicien vous répondra dans les meilleurs délais.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <Card
          className="overflow-hidden transition-all duration-300 rounded-xl sm:rounded-2xl"
          style={themeColor ? { borderColor: themeColor, borderTopWidth: 5, boxShadow: `0 8px 24px ${themeColor}22` } : undefined}
        >
          {selectedApp && (
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 border-b" style={{ background: themeTint, borderColor: `${themeColor}33` }}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white border flex-shrink-0" style={{ borderColor: `${themeColor}55` }}>
                {selectedApp.logo
                  ? <img src={selectedApp.logo} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold" style={{ color: themeColor }}>{selectedApp.label.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ticket pour</p>
                <p className="font-semibold truncate" style={{ color: themeColor }}>{selectedApp.label}</p>
              </div>
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
          {/* Application + type : côte à côte sur tablette/ordinateur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-medium">Application concernée *</Label>
            <Select value={form.application} onValueChange={(v) => setForm(f => ({ ...f, application: v }))}>
              <SelectTrigger className="h-11 sm:h-10" style={themeColor ? { borderColor: themeColor } : undefined}><SelectValue placeholder="Sélectionner une application..." /></SelectTrigger>
              <SelectContent className="max-h-[60vh]">
                {pickerApps.map(app => (
                  <SelectItem key={app.id} value={app.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center flex-shrink-0 bg-white border border-border/50">
                        {app.logo
                          ? <img src={app.logo} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-slate-500">{app.label.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <span>{app.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Request type */}
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-medium">Type de demande *</Label>
            <Select value={form.request_type} onValueChange={(v) => setForm(f => ({ ...f, request_type: v }))}>
              <SelectTrigger className="h-11 sm:h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description *</Label>
            <Textarea
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Décrivez votre problème, les étapes pour le reproduire, les messages d'erreur..."
              rows={5}
              className="min-h-[120px] sm:min-h-[140px] text-base sm:text-sm"
              required
            />
          </div>

          {/* Requester info : affiché seulement si le compte ne fournit pas l'email */}
          {!user?.email && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nom complet *</Label>
              <Input
                value={form.requester_name}
                onChange={(e) => setForm(f => ({ ...f, requester_name: e.target.value }))}
                className="h-11 sm:h-10 text-base sm:text-sm"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email *</Label>
              <Input
                type="email"
                value={form.requester_email}
                onChange={(e) => setForm(f => ({ ...f, requester_email: e.target.value }))}
                className="h-11 sm:h-10 text-base sm:text-sm"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>
          </div>
          )}

          {/* Attachment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Capture d'écran / Pièce jointe</Label>
            {attachment ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate min-w-0">{attachment.name}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-5 sm:p-6 text-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Téléchargement...' : 'Cliquez pour ajouter un fichier (max 5 Mo)'}
                </span>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
              </label>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-10" onClick={() => navigate('/assistance/tickets')}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending} style={themeColor ? { backgroundColor: themeColor } : undefined} className="w-full sm:w-auto h-11 sm:h-10 hover:opacity-90">
              <Send className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Envoi...' : 'Soumettre le ticket'}
            </Button>
          </div>
          </div>
        </Card>
      </form>
    </div>
  );
}