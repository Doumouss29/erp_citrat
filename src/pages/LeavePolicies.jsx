import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Lock, AlertCircle, Save, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { getMe } from "@/lib/rhSession";

export default function LeavePoliciesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    try {
      const user = await getMe();
      setCurrentUser(user);
      
      if (user.role === 'admin') {
        loadPolicy();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    }
    setCheckingAuth(false);
  };

  const loadPolicy = async () => {
    setLoading(true);
    const policies = await base44.entities.LeavePolicy.list();
    
    if (policies.length > 0) {
      setPolicy(policies[0]);
    } else {
      setPolicy({
        annual_leave_days: 25,
        accrual_rate: 2.08,
        sick_leave_requires_justification: true,
        max_consecutive_days: 30,
        min_notice_days: 7,
        carry_forward_enabled: true,
        max_carry_forward_days: 5
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const policies = await base44.entities.LeavePolicy.list();
      
      if (policies.length > 0) {
        await base44.entities.LeavePolicy.update(policies[0].id, policy);
      } else {
        await base44.entities.LeavePolicy.create(policy);
      }
      
      setMessage({ type: "success", text: "Politique de congés enregistrée avec succès" });
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Accès Restreint</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="bg-red-50 rounded-2xl p-6 mb-6">
                <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-lg text-slate-700 font-medium mb-2">
                  Cette section est réservée aux administrateurs RH
                </p>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-slate-700">
                  <strong>Employé détecté :</strong> {currentUser?.full_name || currentUser?.email}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement des politiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <RhPageHeader icon={Settings} title="Politiques de Congés" subtitle="Configuration des règles et paramètres de congés pour l'entreprise" className="!mb-0" />
        </motion.div>

        {message && (
          <Alert className={`mb-6 ${message.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <AlertCircle className={`h-5 w-5 ${message.type === "success" ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className="text-slate-700 font-medium">
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-2xl border-0 bg-white mb-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
            <CardTitle className="text-xl font-bold text-slate-900">Allocation des Congés Annuels</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Jours de congés annuels
                </Label>
                <Input
                  type="number"
                  value={policy?.annual_leave_days || 25}
                  onChange={(e) => setPolicy({...policy, annual_leave_days: parseInt(e.target.value)})}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">Nombre total de jours par an</p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Taux d'accumulation mensuel
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={policy?.accrual_rate || 2.08}
                  onChange={(e) => setPolicy({...policy, accrual_rate: parseFloat(e.target.value)})}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">Jours accumulés par mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-0 bg-white mb-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-orange-50 to-yellow-50 p-6">
            <CardTitle className="text-xl font-bold text-slate-900">Règles de Demande</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Jours consécutifs maximum
                </Label>
                <Input
                  type="number"
                  value={policy?.max_consecutive_days || 30}
                  onChange={(e) => setPolicy({...policy, max_consecutive_days: parseInt(e.target.value)})}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">Maximum de jours en une seule fois</p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Préavis minimum (jours)
                </Label>
                <Input
                  type="number"
                  value={policy?.min_notice_days || 7}
                  onChange={(e) => setPolicy({...policy, min_notice_days: parseInt(e.target.value)})}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">Délai avant la date de début</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Justificatif obligatoire pour congé maladie</p>
                  <p className="text-sm text-slate-600">Les congés maladie nécessiteront un document médical</p>
                </div>
                <Switch
                  checked={policy?.sick_leave_requires_justification || false}
                  onCheckedChange={(checked) => setPolicy({...policy, sick_leave_requires_justification: checked})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-0 bg-white mb-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
            <CardTitle className="text-xl font-bold text-slate-900">Report de Congés</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Autoriser le report des congés</p>
                  <p className="text-sm text-slate-600">Les congés non pris peuvent être reportés sur l'année suivante</p>
                </div>
                <Switch
                  checked={policy?.carry_forward_enabled || false}
                  onCheckedChange={(checked) => setPolicy({...policy, carry_forward_enabled: checked})}
                />
              </div>
            </div>

            {policy?.carry_forward_enabled && (
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Jours reportables maximum
                </Label>
                <Input
                  type="number"
                  value={policy?.max_carry_forward_days || 5}
                  onChange={(e) => setPolicy({...policy, max_carry_forward_days: parseInt(e.target.value)})}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-1">Nombre maximum de jours pouvant être reportés</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-xl rounded-xl px-8 h-12 text-base font-semibold"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer les Politiques"}
          </Button>
        </div>
      </div>
    </div>
  );
}