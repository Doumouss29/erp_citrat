import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, Clock, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaveBalanceCard({ employee, pendingLeaveDays }) {
  if (!employee) return null;

  const usedDays = 25 - (employee.remaining_leave_days || 0);
  const percentageUsed = ((usedDays / 25) * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">Mon Solde de Congés</h3>
              <p className="text-sm text-slate-600">{employee.full_name}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border-2 border-green-200 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-slate-600">Disponible</p>
              </div>
              <p className="text-4xl font-bold text-green-700">{employee.remaining_leave_days || 0}</p>
              <p className="text-xs text-slate-500 mt-1">jours restants</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-semibold text-slate-600">Utilisés</p>
              </div>
              <p className="text-4xl font-bold text-blue-700">{usedDays}</p>
              <p className="text-xs text-slate-500 mt-1">jours pris ({percentageUsed}%)</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border-2 border-orange-200 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <p className="text-sm font-semibold text-slate-600">En attente</p>
              </div>
              <p className="text-4xl font-bold text-orange-700">{pendingLeaveDays}</p>
              <p className="text-xs text-slate-500 mt-1">jours demandés</p>
            </div>
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Progression annuelle</p>
              <Badge className="bg-purple-100 text-purple-700">
                {((employee.remaining_leave_days || 0) / 25 * 100).toFixed(0)}% restant
              </Badge>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0 jours</span>
              <span>25 jours (annuel)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}