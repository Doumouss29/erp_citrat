import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileX, Calendar, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardStats({ stats }) {
  const cards = [
    { title: "Pointages Aujourd'hui", value: stats.todayEntries, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Absences en Attente", value: stats.pendingAbsences, icon: FileX, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Congés en Attente", value: stats.pendingLeaves, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
    { title: "Employés Actifs", value: stats.activeEmployees, icon: Users, color: "text-purple-600", bg: "bg-purple-50" }
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-6 mb-8">
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
                <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center shadow-lg`}>
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