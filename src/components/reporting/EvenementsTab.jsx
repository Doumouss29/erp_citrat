import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useMemo } from "react";
import { sendMail } from "@/components/utils/emailTemplate";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays, parseISO, setYear, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { PartyPopper, Heart, Baby, Flower2, Gift, Send, Bell, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { motion } from "framer-motion";

const EVENT_TYPES = [
  { key: "birthday", label: "Anniversaires", icon: PartyPopper, color: "from-pink-500 to-rose-500", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", badge: "bg-pink-100 text-pink-700" },
  { key: "marriage", label: "Mariages", icon: Heart, color: "from-red-500 to-rose-500", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  { key: "birth", label: "Naissances", icon: Baby, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  { key: "mourning", label: "Deuils", icon: Flower2, color: "from-slate-500 to-slate-600", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", badge: "bg-slate-100 text-slate-700" },
];

function getNextBirthdayInfo(birthDate) {
        if (!birthDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birth = parseISO(birthDate);
        let next = setYear(birth, today.getFullYear());
        if (differenceInDays(next, today) < 0) {
          next = setYear(birth, today.getFullYear() + 1);
        }
        return {
          nextBirthday: next,
          daysUntil: differenceInDays(next, today)
        };
      }

      export default function EvenementsTab({ employees }) {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedType, setSelectedType] = useState("birthday");

  const upcomingBirthdays = useMemo(() => {
    return employees
      .filter(e => e.birth_date && e.is_active)
      .map(e => {
        const birthdayInfo = getNextBirthdayInfo(e.birth_date);
        return {
          ...e,
          daysUntil: birthdayInfo.daysUntil,
          nextBirthday: birthdayInfo.nextBirthday
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [employees]);

  const birthdaysIn3Days = upcomingBirthdays.filter(e => e.daysUntil >= 0 && e.daysUntil <= 3);
  const birthdaysThisWeek = upcomingBirthdays.filter(e => e.daysUntil > 3 && e.daysUntil <= 7);
  const birthdaysThisMonth = upcomingBirthdays.filter(e => e.daysUntil > 7 && e.daysUntil <= 30);

  const sendBirthdayAlerts = async () => {
    if (!window.confirm(`Envoyer une alerte à tous les collègues pour ${birthdaysIn3Days.length} anniversaire(s) imminent(s) ?`)) return;
    setSending(true);
    setResults(null);
    let count = 0;

    // Collègues actifs avec email (sauf l'employé concerné)
    const colleagues = employees.filter(e => e.is_active && e.email);

    for (const birthdayEmp of birthdaysIn3Days) {
      const birthdayDate = format(birthdayEmp.nextBirthday, "dd MMMM", { locale: fr });
      const isToday = birthdayEmp.daysUntil === 0;
      const title = isToday
        ? `🎂 Joyeux Anniversaire à ${birthdayEmp.first_name} ${birthdayEmp.last_name} !`
        : `🎉 Anniversaire de ${birthdayEmp.first_name} ${birthdayEmp.last_name} ${birthdayEmp.daysUntil === 1 ? "demain" : `dans ${birthdayEmp.daysUntil} jours`} !`;
      const message = isToday
        ? `Aujourd'hui, le ${birthdayDate}, c'est l'anniversaire de votre collègue ${birthdayEmp.first_name} ${birthdayEmp.last_name?.toUpperCase()} ! N'hésitez pas à lui souhaiter un joyeux anniversaire 🎉`
        : `L'anniversaire de votre collègue ${birthdayEmp.first_name} ${birthdayEmp.last_name?.toUpperCase()} est le ${birthdayDate} (dans ${birthdayEmp.daysUntil} jour(s)). Pensez à lui souhaiter un joyeux anniversaire ! 🎂`;

      // Si c'est le jour de l'anniversaire, envoyer un message spécial à l'intéressé(e)
      if (isToday && birthdayEmp.email) {
        try {
          await base44.entities.Notification.create({
            user_email: birthdayEmp.email,
            type: "general",
            title: `🎂 Joyeux Anniversaire !`,
            message: `Toute l'équipe CGESN vous souhaite un très joyeux anniversaire ! Bonne journée !`
          });

          await sendMail({
            to: birthdayEmp.email,
            subject: `🎂 Joyeux Anniversaire !`,
            body: `Bonjour ${birthdayEmp.first_name} ${birthdayEmp.last_name},\n\nToute l'équipe CGESN vous souhaite un très joyeux anniversaire ! Nous espérons que cette journée soit remplie de joie et de bonheur.\n\nCordialement,\nLa Direction - CGESN`
          });

          count++;
        } catch (e) {
          console.log("Erreur envoi:", e);
        }
      }

      // Envoyer aux collègues
      for (const colleague of colleagues) {
        if (colleague.id === birthdayEmp.id) continue; // Ne pas envoyer à l'intéressé(e)
        try {
          await base44.entities.Notification.create({
            user_email: colleague.email,
            type: "general",
            title,
            message
          });

          await sendMail({
            to: colleague.email,
            subject: title,
            body: `Bonjour ${colleague.first_name},\n\n${message}\n\nCordialement,\nLa Direction - CGESN`
          });

          count++;
        } catch (e) {
          console.log("Erreur envoi:", e);
        }
      }
    }

    setResults({ count, type: "birthday", summary: `${count} notification(s) envoyée(s) aux collègues avec succès` });
    setSending(false);
  };

  const sendCustomAlert = async (emp, type, message) => {
    if (!emp.email) return;
    const typeLabels = { marriage: "Mariage", birth: "Naissance", mourning: "Deuil" };
    await base44.entities.Notification.create({
      user_email: emp.email,
      type: "general",
      title: `Message de la Direction - ${typeLabels[type]}`,
      message
    });
    await sendMail({
      to: emp.email,
      subject: `Message de la Direction CGESN - ${typeLabels[type]}`,
      body: `Bonjour ${emp.first_name} ${emp.last_name},\n\n${message}\n\nCordialement,\nLa Direction - CGESN`
    });
  };

  const getDaysBadge = (days) => {
    if (days === 0) return <Badge className="bg-red-500 text-white">Aujourd'hui !</Badge>;
    if (days === 1) return <Badge className="bg-orange-500 text-white">Demain</Badge>;
    if (days <= 3) return <Badge className="bg-yellow-500 text-white">Dans {days}j</Badge>;
    if (days <= 7) return <Badge className="bg-blue-100 text-blue-700">Dans {days}j</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">Dans {days}j</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-md border-0 bg-gradient-to-br from-pink-50 to-rose-100">
          <CardContent className="p-4 text-center">
            <PartyPopper className="w-8 h-8 text-pink-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Anniversaires (3j)</p>
            <p className="text-3xl font-bold text-pink-900">{birthdaysIn3Days.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0 bg-gradient-to-br from-rose-50 to-pink-100">
          <CardContent className="p-4 text-center">
            <Gift className="w-8 h-8 text-rose-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Cette semaine</p>
            <p className="text-3xl font-bold text-rose-900">{birthdaysThisWeek.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0 bg-gradient-to-br from-purple-50 to-violet-100">
          <CardContent className="p-4 text-center">
            <PartyPopper className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Ce mois-ci</p>
            <p className="text-3xl font-bold text-purple-900">{birthdaysThisMonth.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Total actifs</p>
            <p className="text-3xl font-bold text-slate-900">{employees.filter(e => e.birth_date && e.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Preview */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b border-blue-100">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Aperçu des messages à envoyer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {birthdaysIn3Days.length > 0 && (
            <>
              {birthdaysIn3Days.some(e => e.daysUntil === 0) && (
                <div className="border-2 border-blue-200 rounded-xl p-4 bg-white">
                  <p className="text-sm font-bold text-blue-900 mb-3">📧 Message envoyé à l'anniversaire du jour :</p>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-2 border-l-4 border-blue-500">
                    <p className="font-semibold text-slate-900">Sujet : 🎂 Joyeux Anniversaire !</p>
                    <p className="text-slate-700">Bonjour [Prénom] [Nom],</p>
                    <p className="text-slate-700 italic">Toute l'équipe CGESN vous souhaite un très joyeux anniversaire ! Nous espérons que cette journée soit remplie de joie et de bonheur.</p>
                    <p className="text-slate-700">Cordialement,<br />La Direction - CGESN</p>
                  </div>
                </div>
              )}
              <div className="border-2 border-pink-200 rounded-xl p-4 bg-white">
                <p className="text-sm font-bold text-pink-900 mb-3">📧 Message envoyé aux collègues :</p>
                <div className="bg-pink-50 rounded-lg p-3 text-sm space-y-2 border-l-4 border-pink-500">
                  <p className="font-semibold text-slate-900">Sujet : 🎉 Anniversaire de [Nom] le {format(birthdaysIn3Days[0]?.nextBirthday, "dd MMMM", { locale: fr })} !</p>
                  <p className="text-slate-700">Bonjour [Prénom du collègue],</p>
                  <p className="text-slate-700 italic">
                    {birthdaysIn3Days[0]?.daysUntil === 0 
                      ? `Aujourd'hui, c'est l'anniversaire de votre collègue ${birthdaysIn3Days[0]?.first_name} ${birthdaysIn3Days[0]?.last_name?.toUpperCase()} ! N'hésitez pas à lui souhaiter un joyeux anniversaire 🎉`
                      : `L'anniversaire de votre collègue ${birthdaysIn3Days[0]?.first_name} ${birthdaysIn3Days[0]?.last_name?.toUpperCase()} est le ${format(birthdaysIn3Days[0]?.nextBirthday, "dd MMMM", { locale: fr })}. Pensez à lui souhaiter un joyeux anniversaire ! 🎂`
                    }
                  </p>
                  <p className="text-slate-700">Cordialement,<br />La Direction - CGESN</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Anniversaires imminents - Priorité */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PartyPopper className="w-6 h-6 text-pink-600" />
              Anniversaires imminents (≤ 3 jours)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-pink-100 text-pink-700">{birthdaysIn3Days.length} alerte(s)</Badge>
              <Button
                onClick={sendBirthdayAlerts}
                disabled={sending || birthdaysIn3Days.length === 0}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                {sending ? (
                  <><Bell className="w-4 h-4 mr-2 animate-pulse" />Envoi...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Envoyer les alertes</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {birthdaysIn3Days.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <PartyPopper className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Aucun anniversaire dans les 3 prochains jours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {birthdaysIn3Days.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.last_name?.toUpperCase()} {emp.first_name}</p>
                      <p className="text-xs text-slate-500">{emp.position} · {format(emp.nextBirthday, "dd MMMM", { locale: fr })}</p>
                    </div>
                  </div>
                  {getDaysBadge(emp.daysUntil)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Alert className="bg-green-50 border-green-300">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-semibold">{results.summary}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Liste anniversaires à venir */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-purple-600" />
            Prochains anniversaires (7 à 30 jours)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {birthdaysThisWeek.length === 0 && birthdaysThisMonth.length === 0 ? (
            <p className="text-center text-slate-500 py-6">Aucun anniversaire à venir dans les 30 prochains jours</p>
          ) : (
            <div className="space-y-2">
              {[...birthdaysThisWeek, ...birthdaysThisMonth].map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{emp.last_name?.toUpperCase()} {emp.first_name}</p>
                      <p className="text-xs text-slate-500">{format(emp.nextBirthday, "dd MMMM", { locale: fr })}</p>
                    </div>
                  </div>
                  {getDaysBadge(emp.daysUntil)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Autres événements - Envoi manuel */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Autres événements (Mariage, Naissance, Deuil...)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ManualEventSender employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}

function ManualEventSender({ employees }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [eventType, setEventType] = useState("marriage");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const messages = {
    marriage: (emp) => `Cher(e) ${emp?.first_name}, toute l'équipe CGESN vous adresse ses plus sincères félicitations à l'occasion de votre mariage. Nous vous souhaitons tout le bonheur du monde !`,
    birth: (emp) => `Cher(e) ${emp?.first_name}, toute l'équipe CGESN vous félicite chaleureusement pour l'heureux événement ! Nous souhaitons tout le bonheur à votre famille et beaucoup de santé à votre enfant.`,
    mourning: (emp) => `Cher(e) ${emp?.first_name}, toute l'équipe CGESN vous présente ses plus sincères condoléances dans cette épreuve difficile. Nous pensons à vous et à votre famille.`,
  };

  const eventLabels = { marriage: "Mariage 💍", birth: "Naissance 👶", mourning: "Deuil 🕊️" };
  const eventColors = { marriage: "bg-red-600 hover:bg-red-700", birth: "bg-blue-600 hover:bg-blue-700", mourning: "bg-slate-600 hover:bg-slate-700" };

  const emp = employees.find(e => e.id === selectedEmployee);

  const handleSend = async () => {
    if (!emp) return;
    setSending(true);
    try {
      const msg = messages[eventType](emp);
      await base44.entities.Notification.create({
        user_email: emp.email,
        type: "general",
        title: `Message de la Direction - ${eventLabels[eventType]}`,
        message: msg
      });
      if (emp.email) {
        await sendMail({
          to: emp.email,
          subject: `Message de la Direction CGESN`,
          body: `Bonjour ${emp.first_name} ${emp.last_name},\n\n${msg}\n\nCordialement,\nLa Direction - CGESN`
        });
      }
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      console.log(e);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["marriage", "birth", "mourning"].map(type => (
          <button
            key={type}
            onClick={() => setEventType(type)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${eventType === type ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          >
            <p className="font-semibold text-slate-900 text-sm">{eventLabels[type]}</p>
            <p className="text-xs text-slate-500 mt-1">Envoyer un message de félicitations ou condoléances</p>
          </button>
        ))}
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">Sélectionner l'employé</label>
        <FormSelect
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:border-violet-400"
        >
          <option value="">-- Choisir un employé --</option>
          {employees.filter(e => e.is_active).sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)).map(e => (
            <option key={e.id} value={e.id}>{e.last_name?.toUpperCase()} {e.first_name}</option>
          ))}
        </FormSelect>
      </div>

      {emp && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 italic">
          "{messages[eventType](emp)}"
        </div>
      )}

      <Button
        onClick={handleSend}
        disabled={!selectedEmployee || sending || sent}
        className={`w-full h-12 text-white ${eventColors[eventType]}`}
      >
        {sent ? (
          <><CheckCircle className="w-5 h-5 mr-2" />Message envoyé !</>
        ) : sending ? (
          <><Send className="w-5 h-5 mr-2 animate-pulse" />Envoi en cours...</>
        ) : (
          <><Send className="w-5 h-5 mr-2" />Envoyer le message</>
        )}
      </Button>
    </div>
  );
}