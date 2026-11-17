import React, { useState } from 'react';
import useAppThemeClass from '@/hooks/useAppThemeClass';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, PriorityBadge, RequestTypeBadge } from '@/components/assistance/shared/StatusBadge';
import { getApplicationInfo } from '@/lib/assistanceConstants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Eye, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PortalReturnButton from '@/components/cgesn/PortalReturnButton';

export default function PublicTicketTracker() {
  useAppThemeClass('assistance-theme');
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(ticketNumber || '');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['si-public-ticket', ticketNumber],
    queryFn: async () => { const page = await base44.entities.SiTicket.filter({ ticket_number: ticketNumber }, { limit: 1 }); return page.items; },
    enabled: !!ticketNumber,
    select: (items) => items[0],
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['si-public-comments', ticket?.id],
    queryFn: () => base44.entities.SiComment.filter({ ticket_id: ticket.id }, { sort: 'created_date' }),
    enabled: !!ticket?.id,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/assistance/suivi/${searchValue.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4 shadow-lg">
            <span className="text-primary-foreground font-heading font-bold text-xl">SI</span>
          </div>
          <h1 className="text-2xl font-heading font-bold">Suivi de ticket</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entrez le numéro de votre ticket pour suivre son statut
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <Card className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: TK-2510-1234"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Button type="submit" className="h-11 px-6">
                <Eye className="w-4 h-4 mr-1" /> Suivre
              </Button>
            </div>
          </Card>
        </form>

        {/* Result */}
        {ticketNumber && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              ) : !ticket ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Aucun ticket trouvé avec ce numéro</p>
                  <p className="text-xs text-muted-foreground mt-1">Vérifiez le numéro et réessayez</p>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <RequestTypeBadge type={ticket.request_type} />
                </div>

                <div>
                  <h2 className="text-lg font-heading font-bold">{ticket.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.application} - Créé le {ticket.created_date ? format(new Date(ticket.created_date), 'dd MMM yyyy', { locale: fr }) : ''}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                </div>

                {ticket.assigned_to_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {ticket.assigned_to_name.charAt(0)}
                    </div>
                    <span className="text-muted-foreground">Pris en charge par</span>
                    <span className="font-medium">{ticket.assigned_to_name}</span>
                  </div>
                )}

                {comments.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Mises à jour ({comments.length})
                    </p>
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div key={c.id} className="text-sm">
                          <span className="text-xs text-muted-foreground">
                            {c.created_date ? format(new Date(c.created_date), 'dd MMM à HH:mm', { locale: fr }) : ''} - {c.author_name}
                          </span>
                          <p className="mt-0.5">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Back to portal */}
        <div className="text-center">
          <PortalReturnButton />
        </div>
      </div>
    </div>
  );
}