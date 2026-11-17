import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, FileX, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

export default function ComparativeStats({ timeEntries, absences, leaves, employees }) {
  const [comparison, setComparison] = useState({
    currentMonth: { entries: 0, absences: 0, leaves: 0, activeEmployees: 0 },
    previousMonth: { entries: 0, absences: 0, leaves: 0, activeEmployees: 0 },
    trends: { entries: 0, absences: 0, leaves: 0, employees: 0 }
  });

  useEffect(() => {
    calculateComparison();
  }, [timeEntries, absences, leaves, employees]);

  const calculateComparison = () => {
    const now = new Date();
    const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const currentMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    
    const previousMonth = subMonths(now, 1);
    const previousMonthStart = format(startOfMonth(previousMonth), "yyyy-MM-dd");
    const previousMonthEnd = format(endOfMonth(previousMonth), "yyyy-MM-dd");

    // Stats mois actuel
    const currentEntries = timeEntries.filter(e => 
      e.date >= currentMonthStart && e.date <= currentMonthEnd && e.entry_type === "entry"
    ).length;
    const currentAbsences = absences.filter(a => 
      a.start_date >= currentMonthStart && a.start_date <= currentMonthEnd
    ).length;
    const currentLeaves = leaves.filter(l => 
      l.start_date >= currentMonthStart && l.start_date <= currentMonthEnd
    ).length;
    const currentActiveEmployees = employees.filter(e => e.is_active).length;

    // Stats mois précédent
    const previousEntries = timeEntries.filter(e => 
      e.date >= previousMonthStart && e.date <= previousMonthEnd && e.entry_type === "entry"
    ).length;
    const previousAbsences = absences.filter(a => 
      a.start_date >= previousMonthStart && a.start_date <= previousMonthEnd
    ).length;
    const previousLeaves = leaves.filter(l => 
      l.start_date >= previousMonthStart && l.start_date <= previousMonthEnd
    ).length;

    // Calculer les tendances (en pourcentage)
    const calcTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    setComparison({
      currentMonth: {
        entries: currentEntries,
        absences: currentAbsences,
        leaves: currentLeaves,
        activeEmployees: currentActiveEmployees
      },
      previousMonth: {
        entries: previousEntries,
        absences: previousAbsences,
        leaves: previousLeaves,
        activeEmployees: currentActiveEmployees
      },
      trends: {
        entries: calcTrend(currentEntries, previousEntries),
        absences: calcTrend(currentAbsences, previousAbsences),
        leaves: calcTrend(currentLeaves, previousLeaves),
        employees: 0 // Pas de comparaison pour les employés actifs
      }
    });
  };

  const TrendBadge = ({ value, inverse = false }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    return (
      <Badge className={`flex items-center gap-1 ${
        isPositive ? 'bg-green-100 text-green-700' :
        isNegative ? 'bg-red-100 text-red-700' :
        'bg-slate-100 text-slate-700'
      }`}>
        {value > 0 ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
        {value > 0 ? '+' : ''}{value}%
      </Badge>
    );
  };

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-xl font-bold text-slate-900">
          Statistiques Comparatives
        </CardTitle>
        <p className="text-sm text-slate-500">
          {format(subMonths(new Date(), 1), "MMMM", { locale: fr })} vs {format(new Date(), "MMMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-blue-600" />
              <TrendBadge value={comparison.trends.entries} />
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Pointages</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-900">{comparison.currentMonth.entries}</p>
              <p className="text-sm text-slate-500">vs {comparison.previousMonth.entries}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <FileX className="w-8 h-8 text-orange-600" />
              <TrendBadge value={comparison.trends.absences} inverse />
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Absences</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-orange-900">{comparison.currentMonth.absences}</p>
              <p className="text-sm text-slate-500">vs {comparison.previousMonth.absences}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <TrendBadge value={comparison.trends.leaves} inverse />
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Congés</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-green-900">{comparison.currentMonth.leaves}</p>
              <p className="text-sm text-slate-500">vs {comparison.previousMonth.leaves}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-600 text-white">Actif</Badge>
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Employés</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-purple-900">{comparison.currentMonth.activeEmployees}</p>
              <p className="text-sm text-slate-500">actifs</p>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}