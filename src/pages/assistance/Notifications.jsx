import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NOTIFICATION_TYPES } from '@/lib/assistanceConstants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bell, Plus, UserCheck, RefreshCw, MessageSquare, CheckCircle,
  CheckCheck, Inbox
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ICONS = { Plus, UserCheck, RefreshCw, MessageSquare, CheckCircle };

export default function Notifications() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['si-notifications', user?.email],
    queryFn: async () => { const page = await base44.entities.SiNotification.filter({ user_email: user?.email }, { sort: '-created_date', limit: 100 }); return page.items; },
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.SiNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['si-notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      const unread = notifications.filter(n => !n.is_read);
      return base44.entities.SiNotification.bulkUpdate(
        unread.map(n => ({ id: n.id, is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['si-notifications'] });
      toast.success('Toutes les notifications marquées comme lues');
    },
  });

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notifications.filter(n => !n.is_read).length} non lue(s)
          </p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck className="w-4 h-4 mr-1" /> Tout marquer lu
          </Button>
        )}
      </motion.div>

      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'ghost'} onClick={() => setFilter('all')}>
          Toutes
        </Button>
        <Button size="sm" variant={filter === 'unread' ? 'default' : 'ghost'} onClick={() => setFilter('unread')}>
          Non lues
        </Button>
      </div>

      <Card className="p-3">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((n, i) => {
              const typeInfo = NOTIFICATION_TYPES[n.type] || {};
              const Icon = ICONS[typeInfo.icon] || Bell;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    n.is_read ? 'bg-transparent' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.created_date ? format(new Date(n.created_date), 'dd MMM yyyy à HH:mm', { locale: fr }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {n.ticket_id && (
                      <Link to={`/assistance/ticket/${n.ticket_id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">Voir</Button>
                      </Link>
                    )}
                    {!n.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => markReadMutation.mutate(n.id)}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}