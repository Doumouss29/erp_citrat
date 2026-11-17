import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/assistance/shared/StatCard';
import { StatusBadge, PriorityBadge, RequestTypeBadge } from '@/components/assistance/shared/StatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TicketIcon, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Plus, ArrowRight, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APPLICATIONS } from '@/lib/assistanceConstants';
import { APP_ICONS, APP_COLORS } from '@/lib/assistanceAppVisuals';

export default function Dashboard() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'admin';

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['si-tickets-dashboard', user?.email, isAdmin],
    queryFn: async () => {
      const page = isAdmin
        ? await base44.entities.SiTicket.list({ sort: '-created_date', limit: 100 })
        : await base44.entities.SiTicket.filter({ requester_email: user?.email }, { sort: '-created_date', limit: 100 });
      return page.items;
    },
    enabled: !!user?.email,
  });

  const stats = {
    total: tickets.length,
    nouveau: tickets.filter(t => t.status === 'nouveau').length,
    enCours: tickets.filter(t => t.status === 'en_cours' || t.status === 'en_attente').length,
    resolu: tickets.filter(t => t.status === 'resolu').length,
    urgent: tickets.filter(t => t.priority === 'urgente' && t.status !== 'ferme' && t.status !== 'resolu').length,
  };

  const recentTickets = tickets.slice(0, 5);
  const byApp = APPLICATIONS.map(app => ({
    ...app,
    count: tickets.filter(t => t.application === app.id).length,
  })).filter(a => a.count > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl px-5 py-6 sm:px-7 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg,#10204a 0%,#1c3f8f 55%,#2056c1 100%)' }}
      >
        {/* Motif réseau discret, rappel du logo */}
        <svg className="absolute -right-6 -top-6 w-48 h-48 opacity-20 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="#67e8f9" strokeWidth="1.2" aria-hidden="true">
          <circle cx="50" cy="50" r="6" fill="#67e8f9" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const x = 50 + 32 * Math.cos((a * Math.PI) / 180);
            const y = 50 + 32 * Math.sin((a * Math.PI) / 180);
            return (
              <g key={a}>
                <line x1="50" y1="50" x2={x} y2={y} />
                <circle cx={x} cy={y} r="4" fill="#67e8f9" />
              </g>
            );
          })}
          <circle cx="50" cy="50" r="32" />
        </svg>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-heading font-bold">
            Bonjour, {user?.full_name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="text-sm text-blue-100/85 mt-1">
            {isAdmin ? "Vue d'ensemble du support informatique" : "Suivez l'état de vos demandes d'assistance"}
          </p>
        </div>
        <Button asChild className="relative bg-white text-primary hover:bg-cyan-50 shadow-md">
          <Link to="/assistance/create-ticket">
            <Plus className="w-4 h-4 mr-2" /> Nouveau ticket
          </Link>
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total tickets" value={stats.total} icon={TicketIcon} color="bg-primary/10 text-primary" delay={0} />
        <StatCard title="Nouveaux" value={stats.nouveau} icon={Activity} color="bg-cyan-100 text-cyan-700" delay={0.1} />
        <StatCard title="En cours" value={stats.enCours} icon={Clock} color="bg-amber-100 text-amber-600" delay={0.2} />
        <StatCard title="Résolus" value={stats.resolu} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" delay={0.3} />
      </div>

      {stats.urgent > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {stats.urgent} ticket{stats.urgent > 1 ? 's' : ''} urgent{stats.urgent > 1 ? 's' : ''} en cours
            </p>
            <p className="text-xs text-red-600">Ces tickets nécessitent une attention immédiate.</p>
          </div>
        </motion.div>
      )}

      {/* Recent tickets */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Tickets récents
          </h2>
          <Link to="/assistance/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
          ) : recentTickets.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucun ticket pour le moment
            </div>
          ) : (
            recentTickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/assistance/ticket/${ticket.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="font-mono text-xs text-muted-foreground w-24">{ticket.ticket_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{ticket.application}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RequestTypeBadge type={ticket.request_type} />
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {ticket.created_date ? format(new Date(ticket.created_date), 'dd MMM', { locale: fr }) : ''}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* By application */}
      {byApp.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-heading font-semibold mb-4">Tickets par application</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {byApp.map((app, i) => {
              const Icon = APP_ICONS[app.id] || TicketIcon;
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${APP_COLORS[app.id] || 'from-gray-400 to-gray-600'} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium truncate">{app.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{app.count}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}