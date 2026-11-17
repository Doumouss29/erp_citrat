import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Mail, Calendar, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const { data: requesters = [], isLoading } = useQuery({
    queryKey: ['si-requesters'],
    queryFn: async () => { const page = await base44.entities.SiRequester.list({ sort: '-requests_count', limit: 500 }); return page.items; },
  });

  const filtered = useMemo(() => {
    if (!search) return requesters;
    const q = search.toLowerCase();
    return requesters.filter(r =>
      r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [requesters, search]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {requesters.length} demandeur{requesters.length > 1 ? 's' : ''} enregistré{requesters.length > 1 ? 's' : ''}
        </p>
      </motion.div>

      <Card className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Nom</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Tickets</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Dernière demande</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-muted/30 transition-colors border-b"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {r.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" /> {r.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold bg-secondary px-2 py-0.5 rounded-full">
                        <TicketIcon className="w-3 h-3" /> {r.requests_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.last_request_date ? format(new Date(r.last_request_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}