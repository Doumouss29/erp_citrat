import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SIKanban from '@/components/assistance/si/SIKanban';
import SIQueue from '@/components/assistance/si/SIQueue';
import SIStatsBar from '@/components/assistance/si/SIStatsBar';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SIWorkspace() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [view, setView] = useState('kanban');


  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['si-workspace-tickets'],
    queryFn: async () => { const page = await base44.entities.SiTicket.list({ sort: '-created_date', limit: 500 }); return page.items; },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['si-workspace-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['si-tickets'] });
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">Espace de travail SI</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez et suivez tous les tickets en temps réel</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-1 border rounded-lg p-1 bg-card w-full sm:w-auto">
          <Button
            size="sm"
            variant={view === 'kanban' ? 'default' : 'ghost'}
            onClick={() => setView('kanban')}
            className="h-8"
          >
            <LayoutGrid className="w-4 h-4 mr-1" /> Kanban
          </Button>
          <Button
            size="sm"
            variant={view === 'queue' ? 'default' : 'ghost'}
            onClick={() => setView('queue')}
            className="h-8"
          >
            <TableIcon className="w-4 h-4 mr-1" /> File
          </Button>
        </div>
      </motion.div>

      <SIStatsBar tickets={tickets} />

      <Card className="p-3 sm:p-4 lg:p-5">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>
        ) : view === 'kanban' ? (
          <SIKanban tickets={tickets} onRefetch={refetch} user={user} />
        ) : (
          <SIQueue tickets={tickets} onRefetch={refetch} />
        )}
      </Card>
    </div>
  );
}