import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TicketTable from '@/components/assistance/shared/TicketTable';
import TicketFilters from '@/components/assistance/shared/TicketFilters';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { Plus, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EMPTY_FILTERS = { search: '', application: '', status: '', priority: '', request_type: '' };

export default function TicketsList() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['si-tickets-list', user?.email, isAdmin],
    queryFn: async () => {
      const page = isAdmin
        ? await base44.entities.SiTicket.list({ sort: '-created_date', limit: 200 })
        : await base44.entities.SiTicket.filter({ requester_email: user?.email }, { sort: '-created_date', limit: 200 });
      return page.items;
    },
    enabled: !!user?.email,
  });

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.title?.toLowerCase().includes(q) && !t.ticket_number?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
      }
      if (filters.application && t.application !== filters.application) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.request_type && t.request_type !== filters.request_type) return false;
      return true;
    });
  }, [tickets, filters]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-primary" /> Mes tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} ticket{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        {!isAdmin && (
          <Button asChild>
            <Link to="/assistance/create-ticket">
              <Plus className="w-4 h-4 mr-2" /> Nouveau ticket
            </Link>
          </Button>
        )}
      </motion.div>

      <Card className="p-5 space-y-4">
        <TicketFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>
        ) : (
          <PullToRefresh onRefresh={refetch}>
            <TicketTable tickets={filtered} showRequester={isAdmin} />
          </PullToRefresh>
        )}
      </Card>
    </div>
  );
}