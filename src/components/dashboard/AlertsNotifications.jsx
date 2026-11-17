import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, CheckCircle2, FileX, Calendar, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AlertsNotifications({ absences, leaves, employees = [] }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    generateAlerts();
  }, [absences, leaves, employees]);

  const generateAlerts = () => {
    const alertsList = [];

    // Absences sans justificatif (type maladie ou accident)
    const absencesWithoutJustification = absences.filter(a => 
      (a.absence_type === "maladie" || a.absence_type === "accident_travail") &&
      !a.justification_file_url &&
      differenceInDays(new Date(), new Date(a.requested_date || a.created_date)) > 0
    );

    if (absencesWithoutJustification.length > 0) {
      alertsList.push({
        id: 'missing-justification',
        type: 'danger',
        icon: AlertTriangle,
        title: `${absencesWithoutJustification.length} absence${absencesWithoutJustification.length > 1 ? 's' : ''} sans justificatif`,
        description: 'Justificatif médical manquant',
        action: 'Voir les absences',
        link: createPageUrl("Validation"),
        count: absencesWithoutJustification.length
      });
    }

    // Demandes urgentes (<48h)
    const urgentLeaves = leaves.filter(l => 
      l.is_urgent && (l.status?.startsWith("pending") || l.status === "pending")
    );

    if (urgentLeaves.length > 0) {
      alertsList.push({
        id: 'urgent-leaves',
        type: 'danger',
        icon: Clock,
        title: `${urgentLeaves.length} demande${urgentLeaves.length > 1 ? 's' : ''} urgente${urgentLeaves.length > 1 ? 's' : ''}`,
        description: 'Départ dans moins de 48h',
        action: 'Traiter maintenant',
        link: createPageUrl("Validation"),
        count: urgentLeaves.length
      });
    }

    // Demandes récemment approuvées (confirmation)
    const recentlyApproved = [...absences, ...leaves].filter(r => 
      r.status === "approved" &&
      differenceInDays(new Date(), new Date(r.level3_date || r.level2_date || r.level1_date || r.created_date)) <= 1
    ).slice(0, 3);

    if (recentlyApproved.length > 0) {
      alertsList.push({
        id: 'recently-approved',
        type: 'success',
        icon: CheckCircle2,
        title: `${recentlyApproved.length} demande${recentlyApproved.length > 1 ? 's' : ''} approuvée${recentlyApproved.length > 1 ? 's' : ''}`,
        description: 'Validées récemment',
        action: 'Voir le détail',
        link: createPageUrl("Validation"),
        count: recentlyApproved.length
      });
    }

    // Stagiaires dont le contrat a expiré
    const expiredInterns = employees.filter(e => {
      if (!e.internship_type || !e.internship_end_date) return false;
      const daysRemaining = differenceInDays(new Date(e.internship_end_date), new Date());
      return daysRemaining < 0;
    });

    if (expiredInterns.length > 0) {
      alertsList.unshift({
        id: 'expired-interns',
        type: 'danger',
        icon: Users,
        title: `${expiredInterns.length} Contrat${expiredInterns.length > 1 ? 's' : ''} de Stagiaire${expiredInterns.length > 1 ? 's' : ''} expiré${expiredInterns.length > 1 ? 's' : ''}`,
        description: '',
        action: 'Voir les stagiaires',
        link: createPageUrl("GestionPersonnel?tab=interns"),
        count: expiredInterns.length
      });
    }

    // Demandes en attente de validation (en haut de la liste)
    const pendingAbsences = absences.filter(a => 
      a.status?.startsWith("pending") || a.status === "pending"
    );
    const pendingLeaves = leaves.filter(l => 
      l.status?.startsWith("pending") || l.status === "pending"
    );

    if (pendingLeaves.length > 0) {
      alertsList.unshift({
        id: 'pending-leaves',
        type: 'info',
        icon: Calendar,
        title: `${pendingLeaves.length} demande${pendingLeaves.length > 1 ? 's' : ''} de congé en attente`,
        description: '',
        action: 'Voir les demandes',
        link: createPageUrl("Validation"),
        count: pendingLeaves.length
      });
    }

    if (pendingAbsences.length > 0) {
      alertsList.unshift({
        id: 'pending-absences',
        type: 'info',
        icon: FileX,
        title: `${pendingAbsences.length} demande${pendingAbsences.length > 1 ? 's' : ''} d'absence en attente`,
        description: '',
        action: 'Voir les demandes',
        link: createPageUrl("Validation"),
        count: pendingAbsences.length
      });
    }

    // Stagiaires dont le contrat expire dans 30 jours (ayant is_favorite = true)
    const expiringInterns = employees.filter(e => {
      if (!e.internship_type || !e.internship_end_date) return false;
      const daysRemaining = differenceInDays(new Date(e.internship_end_date), new Date());
      return daysRemaining >= 0 && daysRemaining <= 30 && e.is_favorite;
    });

    if (expiringInterns.length > 0) {
      alertsList.push({
        id: 'expiring-interns',
        type: 'warning',
        icon: Users,
        title: `${expiringInterns.length} Contrats de Stagiaires à renouveler`,
        description: '',
        action: 'Voir les stagiaires',
        link: createPageUrl("GestionPersonnel?tab=interns"),
        count: expiringInterns.length
      });
    }

    setAlerts(alertsList);
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'danger':
        return 'from-red-50 to-red-100 border-red-200';
      case 'warning':
        return 'from-orange-50 to-orange-100 border-orange-200';
      case 'info':
        return 'from-blue-50 to-blue-100 border-blue-200';
      case 'success':
        return 'from-green-50 to-green-100 border-green-200';
      default:
        return 'from-slate-50 to-slate-100 border-slate-200';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Alertes & Notifications
          </CardTitle>
          {alerts.length > 0 && (
            <Badge className="bg-red-600 text-white">{alerts.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert, idx) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-gradient-to-r ${getAlertStyle(alert.type)} border rounded-xl p-3 sm:p-4`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <alert.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${getIconColor(alert.type)} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 mb-1 text-sm sm:text-base leading-tight">{alert.title}</p>
                      {alert.description && <p className="text-xs sm:text-sm text-slate-600">{alert.description}</p>}
                    </div>
                  </div>
                  <Link to={alert.link} className="flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="whitespace-nowrap rounded-lg text-xs sm:text-sm w-full sm:w-auto"
                    >
                      {alert.action}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700">Aucune alerte</p>
            <p className="text-sm text-slate-500 mt-1">Tout est en ordre !</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}