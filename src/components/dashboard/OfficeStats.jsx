import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, GraduationCap, TrendingUp, MapPin, Briefcase, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart as RechartPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function OfficeStats({ employees }) {
  const [selectedView, setSelectedView] = useState("overview");

  // Grouper par bureau
  const officeGroups = employees.reduce((acc, emp) => {
    const office = emp.office || "Non défini";
    if (!acc[office]) {
      acc[office] = {
        total: 0,
        hommes: 0,
        femmes: 0,
        stagiaires: 0,
        stagiairesHommes: 0,
        stagiairesFemmes: 0,
        stageEcole: 0,
        stagePerfectionnement: 0
      };
    }
    
    acc[office].total++;
    
    const isStage = emp.contract_type === "Stage" || emp.internship_type;
    const gender = emp.gender;
    
    if (isStage) {
      acc[office].stagiaires++;
      if (gender === "Homme") acc[office].stagiairesHommes++;
      if (gender === "Femme") acc[office].stagiairesFemmes++;
      
      if (emp.internship_type === "STAGE ECOLE") acc[office].stageEcole++;
      if (emp.internship_type === "PERFECTIONNEMENT") acc[office].stagePerfectionnement++;
    } else {
      if (gender === "Homme") acc[office].hommes++;
      if (gender === "Femme") acc[office].femmes++;
    }
    
    return acc;
  }, {});

  const offices = Object.entries(officeGroups).sort((a, b) => b[1].total - a[1].total);

  // Données pour les graphiques
  const totalEmployees = employees.length;
  const totalExternes = employees.filter(e => e.contract_type === "Prestation").length;
  const totalSalaries = employees.filter(e => !e.internship_type && e.contract_type !== "Stage" && e.contract_type !== "Prestation").length;
  const totalInterns = employees.filter(e => e.internship_type || e.contract_type === "Stage").length;
  const totalMen = employees.filter(e => e.gender === "Homme").length;
  const totalWomen = employees.filter(e => e.gender === "Femme").length;

  const genderData = [
    { name: "Hommes", value: totalMen, color: "#3b82f6" },
    { name: "Femmes", value: totalWomen, color: "#ec4899" }
  ];

  const employeeTypeData = [
    { name: "Salariés", value: totalSalaries, color: "#8b5cf6" },
    { name: "Prestataires et consultants", value: totalExternes, color: "#0d9488" },
    { name: "Stagiaires", value: totalInterns, color: "#06b6d4" }
  ];

  const officeChartData = offices.map(([office, stats]) => ({
    name: office.length > 15 ? office.substring(0, 15) + "..." : office,
    fullName: office,
    salaries: stats.total - stats.stagiaires,
    stagiaires: stats.stagiaires
  }));

  const COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble statistiques globales */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-medium opacity-90">Total Employés</p>
              <p className="text-4xl font-bold mt-2">{totalEmployees}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-8 h-8 opacity-80" />
                <Badge className="bg-white/20 text-white">{Math.round((totalSalaries/totalEmployees)*100)}%</Badge>
              </div>
              <p className="text-sm font-medium opacity-90">Salariés</p>
              <p className="text-4xl font-bold mt-2">{totalSalaries}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <GraduationCap className="w-8 h-8 opacity-80" />
                <Badge className="bg-white/20 text-white">{Math.round((totalInterns/totalEmployees)*100)}%</Badge>
              </div>
              <p className="text-sm font-medium opacity-90">Stagiaires</p>
              <p className="text-4xl font-bold mt-2">{totalInterns}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MapPin className="w-8 h-8 opacity-80" />
                <Building2 className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-medium opacity-90">Bureaux</p>
              <p className="text-4xl font-bold mt-2">{offices.length}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphiques visuels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Répartition par Genre
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <RechartPie>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartPie>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-slate-600">Hommes</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalMen}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    <span className="text-sm text-slate-600">Femmes</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalWomen}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-cyan-600" />
                Type d'Employés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <RechartPie>
                  <Pie
                    data={employeeTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {employeeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartPie>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-slate-600">Salariés</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalSalaries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                    <span className="text-sm text-slate-600">Stagiaires</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalInterns}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphique des bureaux */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Répartition par Bureau
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={officeChartData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                          <p className="font-bold text-slate-900">{payload[0].payload.fullName}</p>
                          <p className="text-sm text-purple-600">Salariés: {payload[0].value}</p>
                          <p className="text-sm text-cyan-600">Stagiaires: {payload[1].value}</p>
                          <p className="text-sm text-slate-600 font-bold">Total: {payload[0].value + payload[1].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="salaries" name="Salariés" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="stagiaires" name="Stagiaires" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}