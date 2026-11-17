import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/assistance/shared/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import {
  TicketIcon, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Users
} from 'lucide-react';
import { APPLICATIONS, STATUSES, PRIORITIES, REQUEST_TYPES } from '@/lib/assistanceConstants';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const STATUS_COLORS = {
  nouveau: '#10b981',
  en_attente: '#eab308',
  en_cours: '#3b82f6',
  resolu: '#22c55e',
  ferme: '#9ca3af',
};

const PRIORITY_COLORS = {
  urgente: '#ef4444',
  elevee: '#f97316',
  moyenne: '#3b82f6',
  faible: '#94a3b8',
};

export default function Statistics() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['si-stats-tickets'],
    queryFn: async () => { const page = await base44.entities.SiTicket.list({ sort: '-created_date', limit: 1000 }); return page.items; },
  });

  const stats = useMemo(() => {
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolu' || t.status === 'ferme').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const avgResolutionTime = 'N/A';
    const urgent = tickets.filter(t => t.priority === 'urgente').length;

    const byStatus = STATUSES.map(s => ({
      name: s.label,
      value: tickets.filter(t => t.status === s.id).length,
      color: STATUS_COLORS[s.id],
    }));

    const byPriority = PRIORITIES.map(p => ({
      name: p.label,
      value: tickets.filter(t => t.priority === p.id).length,
      color: PRIORITY_COLORS[p.id],
    }));

    const byApp = APPLICATIONS.map(a => ({
      name: a.label,
      tickets: tickets.filter(t => t.application === a.id).length,
    })).filter(a => a.tickets > 0);

    const byType = REQUEST_TYPES.map(r => ({
      name: r.label,
      value: tickets.filter(t => t.request_type === r.id).length,
    })).filter(r => r.value > 0);

    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    }).map(day => ({
      date: format(day, 'EEE dd', { locale: fr }),
      tickets: tickets.filter(t => t.created_date && format(new Date(t.created_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
    }));

    return { total, resolved, resolutionRate, avgResolutionTime, urgent, byStatus, byPriority, byApp, byType, last7Days };
  }, [tickets]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Statistiques
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Analyse des tickets et performances du support</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-4">
        <StatCard title="Total tickets" value={stats.total} icon={TicketIcon} color="bg-primary/10 text-primary" delay={0} />
        <StatCard title="Taux de résolution" value={`${stats.resolutionRate}%`} icon={CheckCircle2} color="bg-green-100 text-green-600" delay={0.1} />
        <StatCard title="Tickets urgents" value={stats.urgent} icon={AlertTriangle} color="bg-red-100 text-red-600" delay={0.2} />
        <StatCard title="En cours" value={tickets.filter(t => t.status === 'en_cours' || t.status === 'en_attente').length} icon={Clock} color="bg-blue-100 text-blue-600" delay={0.3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By status */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Répartition par statut</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.byStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {stats.byStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* By priority */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Répartition par priorité</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.byPriority}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {stats.byPriority.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* By application */}
        {stats.byApp.length > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Tickets par application</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.byApp}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Last 7 days trend */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Tickets créés (7 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.last7Days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="tickets"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}