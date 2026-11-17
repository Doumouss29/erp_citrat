import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronRight, User, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrgChart({ employees }) {
  const [expandedDepts, setExpandedDepts] = useState({
    direction_generale: true,
    administratif_financier: true,
    grand_projet_developpement: true,
    bureau_abidjan: true,
    bureau_yamoussoukro: true,
    bureau_daloa: true,
    bureau_bouafle: true,
    bureau_sinfra: true,
    bureau_issia: true
  });

  const departments = [
    { 
      key: 'direction_generale', 
      name: 'Direction Générale', 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    },
    { 
      key: 'administratif_financier', 
      name: 'Administratif & Financier', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    { 
      key: 'grand_projet_developpement', 
      name: 'Grand Projet & Développement', 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    { 
      key: 'bureau_abidjan', 
      name: 'Bureau Abidjan', 
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-700'
    },
    { 
      key: 'bureau_yamoussoukro', 
      name: 'Bureau Yamoussoukro', 
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      textColor: 'text-teal-700'
    },
    { 
      key: 'bureau_daloa', 
      name: 'Bureau Daloa', 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700'
    },
    { 
      key: 'bureau_bouafle', 
      name: 'Bureau Bouaflé', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700'
    },
    { 
      key: 'bureau_sinfra', 
      name: 'Bureau Sinfra', 
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      textColor: 'text-pink-700'
    },
    { 
      key: 'bureau_issia', 
      name: 'Bureau Issia', 
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700'
    }
  ];

  const toggleDepartment = (deptKey) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptKey]: !prev[deptKey]
    }));
  };

  const getEmployeesByDepartment = (deptKey) => {
    return employees.filter(e => e.department === deptKey && e.is_active);
  };

  const getPositionPriority = (position) => {
    const priorities = {
      'Directeur Général': 1,
      'DG': 1,
      'Responsable Administratif': 2,
      'Responsable Logistique': 2,
      'Chef de Projet': 2,
      'Géomètre Expert': 3,
      'Ingénieur Projet': 3,
      'Topographe': 4,
      'Technicien Topographie': 5,
      'Agent Administratif': 5,
      'Agent Logistique': 5,
      'Chauffeur': 6,
      'Stagiaire': 7
    };
    // Comparaison sans tenir compte de la casse ni des accents (postes enregistrés en majuscules)
    const clean = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const match = Object.keys(priorities).find((key) => clean(key) === clean(position));
    return match ? priorities[match] : 10;
  };

  return (
    <Card className="shadow-2xl border-0 bg-white">
      <CardHeader className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                Organigramme
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {employees.filter(e => e.is_active && e.contract_type !== "Prestation").length} employés actifs
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {departments.map((dept) => {
            const deptEmployees = getEmployeesByDepartment(dept.key)
              .sort((a, b) => getPositionPriority(a.position) - getPositionPriority(b.position));
            
            if (deptEmployees.length === 0) return null;

            return (
              <motion.div
                key={dept.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-l-4 rounded-r-2xl overflow-hidden shadow-lg"
                style={{ borderColor: dept.color.split(' ')[1].replace('to-', '') }}
              >
                <div
                  className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${dept.bgColor} border ${dept.borderColor}`}
                  onClick={() => toggleDepartment(dept.key)}
                >
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center shadow-lg`}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{dept.name}</h3>
                        <p className="text-sm text-slate-600">
                          {deptEmployees.length} employé{deptEmployees.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${dept.bgColor} ${dept.textColor} border ${dept.borderColor} text-sm px-3 py-1`}>
                        {deptEmployees.length}
                      </Badge>
                      {expandedDepts[dept.key] ? (
                        <ChevronDown className="w-6 h-6 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedDepts[dept.key] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white p-5 space-y-3">
                        {deptEmployees.map((employee, index) => (
                          <motion.div
                            key={employee.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                          >
                            <div className="relative flex-shrink-0">
                              {employee.photo_url ? (
                                <img
                                  src={employee.photo_url}
                                  alt={employee.full_name}
                                  className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover border-2 border-slate-200 shadow-md"
                                />
                              ) : (
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md border-2 border-white`}>
                                  {employee.first_name?.[0]?.toUpperCase() || employee.last_name?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-500 border-2 border-white"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm md:text-base truncate">{employee.first_name} {employee.last_name}</p>
                              <p className="text-xs md:text-sm text-slate-600 truncate">{employee.position}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {employee.employee_code}
                                </Badge>
                                {employee.email && (
                                  <span className="text-xs text-slate-500 truncate max-w-[120px] md:max-w-none hidden md:inline">📧 {employee.email}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 hidden sm:block">
                              {employee.remaining_leave_days !== undefined && (
                                <div className="bg-blue-50 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-blue-200">
                                  <p className="text-xs text-slate-600">Congés</p>
                                  <p className="font-bold text-blue-700 text-sm md:text-base">{employee.remaining_leave_days}j</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}