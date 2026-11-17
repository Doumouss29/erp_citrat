// Jours fériés en Côte d'Ivoire (dates fixes)
const HOLIDAYS_CI = [
  // Fêtes fixes
  { month: 1, day: 1 },   // Jour de l'An
  { month: 5, day: 1 },   // Fête du Travail
  { month: 8, day: 7 },   // Fête de l'Indépendance
  { month: 8, day: 15 },  // Assomption
  { month: 11, day: 1 },  // Toussaint
  { month: 11, day: 15 }, // Journée nationale de la paix
  { month: 12, day: 25 }, // Noël
];

// Fonction pour vérifier si une date est un jour férié
export function isHoliday(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return HOLIDAYS_CI.some(h => h.month === month && h.day === day);
}

// Fonction pour vérifier si une date est un weekend (dimanche uniquement en Côte d'Ivoire)
export function isWeekend(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0; // 0 = dimanche uniquement (samedi est ouvrable en CI)
}

// Fonction pour vérifier si une date est un jour ouvré
export function isWorkingDay(date) {
  return !isWeekend(date) && !isHoliday(date);
}

// Fonction pour calculer le nombre de jours ouvrés entre deux dates
export function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Réinitialiser les heures pour éviter les problèmes de comparaison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (start > end) return 0;
  
  let workingDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isWorkingDay(current)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

// Fonction pour obtenir la liste des jours non-ouvrés dans une période
export function getNonWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const nonWorkingDays = [];
  const current = new Date(start);
  
  while (current <= end) {
    if (!isWorkingDay(current)) {
      nonWorkingDays.push({
        date: new Date(current),
        reason: isHoliday(current) ? 'Jour férié' : 'Dimanche'
      });
    }
    current.setDate(current.getDate() + 1);
  }
  
  return nonWorkingDays;
}