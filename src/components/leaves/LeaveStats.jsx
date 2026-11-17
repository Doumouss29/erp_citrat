import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaveStats({ leaves, employees, currentUser, isHR }) {
  const employee = employees.find(e => e.email === currentUser?.email);
  
  const stats = isHR ? {
    pending: leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    totalDays: leaves.filter(l => l.status === "approved").reduce((sum, l) => sum + l.total_days, 0)
  } : {
    remaining: employee?.remaining_leave_days || 25,
    pending: leaves.filter(l => (l.employee_email || l.created_by) === currentUser?.email && (l.status === "pending" || l.status?.startsWith("pending_"))).length,
    approved: leaves.filter(l => (l.employee_email || l.created_by) === currentUser?.email && l.status === "approved").length
  };

  const cards = isHR ? [
    { title: "Demandes en Attente", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Approuvées", value: stats.approved, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { title: "Total Jours Approuvés", value: stats.totalDays, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" }
  ] : [
    { title: "Jours Restants", value: stats.remaining, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
    { title: "En Attente", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Approuvées", value: stats.approved, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">{card.title}</p>
                  <p className="text-4xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-7 h-7 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}