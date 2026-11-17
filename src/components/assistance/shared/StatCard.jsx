import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, icon: Icon, color, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="h-full"
    >
      <Card className="h-full p-4 md:p-3.5 lg:p-5 hover:shadow-lg transition-all duration-300 border border-border/50 group">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide lg:tracking-wider whitespace-nowrap truncate" title={title}>{title}</p>
            <p className="text-2xl lg:text-3xl font-heading font-bold mt-1.5 lg:mt-2 text-foreground">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            )}
          </div>
          <div className={`w-9 h-9 lg:w-11 lg:h-11 flex-shrink-0 rounded-lg lg:rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}