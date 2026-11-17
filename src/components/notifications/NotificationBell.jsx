import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, Check, Calendar, FileX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NotificationBell({ userEmail, buttonClassName = "" }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  const lastNotificationIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const loadNotifications = useCallback(async () => {
    if (!userEmail) {
      console.log("NotificationBell: pas d'email utilisateur");
      return;
    }
    // Pas de vérification hors ligne ou onglet masqué : la suivante reprendra
    if (!navigator.onLine || document.visibilityState === "hidden") return;
    let notifs;
    try {
      notifs = await base44.entities.Notification.filter(
        { user_email: userEmail },
        "-created_date",
        50
      );
    } catch (error) {
      // Coupure réseau passagère : on garde la liste actuelle et on réessaie au prochain cycle
      if (!error?.response && !error?.status) return;
      throw error;
    }
    
    // Détecter nouvelle notification (pas au premier chargement)
    if (!isFirstLoadRef.current && notifs.length > 0) {
      const latestNotif = notifs[0];
      if (lastNotificationIdRef.current && latestNotif.id !== lastNotificationIdRef.current) {
        // Nouvelle notification détectée
        setNewNotification(latestNotif);
        // Masquer après 5 secondes
        setTimeout(() => setNewNotification(null), 5000);
      }
    }
    
    if (notifs.length > 0) {
      lastNotificationIdRef.current = notifs[0].id;
    }
    isFirstLoadRef.current = false;
    setNotifications(notifs);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      loadNotifications();
      // Polling toutes les 60 secondes pour éviter le rate limit
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [userEmail, loadNotifications]);

  const markAsRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, { is_read: true });
    loadNotifications();
  };

  const markAllAsRead = async () => {
    setLoading(true);
    const unreadNotifs = notifications.filter(n => !n.is_read);
    await Promise.all(
      unreadNotifs.map(n => base44.entities.Notification.update(n.id, { is_read: true }))
    );
    await loadNotifications();
    setLoading(false);
  };

  const deleteNotification = async (notificationId) => {
    await base44.entities.Notification.delete(notificationId);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    if (type.includes("absence")) return <FileX className="w-5 h-5" />;
    if (type.includes("leave")) return <Calendar className="w-5 h-5" />;
    return <Bell className="w-5 h-5" />;
  };

  const getColor = (type) => {
    if (type.includes("approved")) return "text-green-600 bg-green-50 border-green-200";
    if (type.includes("rejected")) return "text-red-600 bg-red-50 border-red-200";
    if (type.includes("new_")) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  return (
    <div className="relative">
      {/* Toast notification pour nouvelle notification */}
      <AnimatePresence>
        {newNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 left-4 lg:left-auto z-[100] lg:max-w-sm"
          >
            <Alert className={`shadow-2xl border-2 ${getColor(newNotification.type)}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getColor(newNotification.type)}`}>
                  {getIcon(newNotification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{newNotification.title}</p>
                  <AlertDescription className="text-sm mt-1">
                    {newNotification.message}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNewNotification(null)}
                  className="h-6 w-6 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowPanel(!showPanel)}
        aria-label="Notifications"
        className={`relative rounded-xl ${buttonClassName}`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="bg-red-600 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
              {unreadCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      <AnimatePresence>
        {showPanel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)_+_4.25rem)] z-50 lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:mt-2 lg:w-96"
            >
              <Card className="shadow-2xl border-0">
                <CardHeader className="border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Notifications
                    </CardTitle>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Tout marquer lu
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 hover:bg-slate-50 transition-colors ${
                            !notif.is_read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${getColor(notif.type)}`}>
                              {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className={`font-semibold text-sm ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {notif.title}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteNotification(notif.id)}
                                  className="h-6 w-6 text-slate-400 hover:text-slate-600 flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">
                                {notif.message}
                              </p>
                              {/^\/(portail|administration|rh\/(Conges|Absences|Validation)|hse)(\?|$)/.test(notif.mail_notice?.path || "") && (
                                <a className="text-sm font-semibold text-teal-800 underline" href={notif.mail_notice.path}>{notif.mail_notice.button}</a>
                              )}
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                  {format(new Date(notif.created_date), "dd MMM yyyy à HH:mm", { locale: fr })}
                                </p>
                                {!notif.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notif.id)}
                                    className="text-xs text-blue-600 hover:text-blue-700 h-6 px-2"
                                  >
                                    Marquer lu
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}