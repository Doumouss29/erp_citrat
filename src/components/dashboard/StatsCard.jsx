import React from 'react';
import { Card, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, bgColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${bgColor} rounded-full opacity-10`} />
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
              <Icon className={`w-6 h-6 ${bgColor.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}