import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge, RequestTypeBadge } from './StatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TicketTable({ tickets, showRequester = true }) {
  if (!tickets?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Aucun ticket trouvé</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs font-semibold uppercase tracking-wider">N°</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Titre</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Application</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Type</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Priorité</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Statut</TableHead>
            {showRequester && <TableHead className="text-xs font-semibold uppercase tracking-wider">Demandeur</TableHead>}
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket, i) => (
            <motion.tr
              key={ticket.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group hover:bg-muted/30 transition-colors cursor-pointer border-b"
            >
              <TableCell className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</TableCell>
              <TableCell>
                <Link to={`/assistance/ticket/${ticket.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors">
                  {ticket.title}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-full">{ticket.application}</span>
              </TableCell>
              <TableCell><RequestTypeBadge type={ticket.request_type} /></TableCell>
              <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
              <TableCell><StatusBadge status={ticket.status} /></TableCell>
              {showRequester && <TableCell className="text-sm text-muted-foreground">{ticket.requester_name}</TableCell>}
              <TableCell className="text-xs text-muted-foreground">
                {ticket.created_date ? format(new Date(ticket.created_date), 'dd MMM yyyy', { locale: fr }) : '-'}
              </TableCell>
              <TableCell>
                <Link to={`/assistance/ticket/${ticket.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </Link>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}