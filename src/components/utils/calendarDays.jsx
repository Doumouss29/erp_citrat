// Utilitaire pour calculer les jours calendaires (JC)
// Les congés en Côte d'Ivoire sont comptabilisés en jours calendaires

/**
 * Calcule le nombre de jours calendaires entre deux dates (inclusif)
 * @param {string} startDate - Date de début (format YYYY-MM-DD)
 * @param {string} endDate - Date de fin (format YYYY-MM-DD)
 * @returns {number} Nombre de jours calendaires
 */
export function calculateCalendarDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculer la différence en millisecondes
  const diffTime = Math.abs(end - start);
  
  // Convertir en jours et ajouter 1 pour inclure le dernier jour
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return diffDays;
}

/**
 * Calcule le nombre de jours calendaires acquis en fonction de l'ancienneté
 * @param {number} monthsWorked - Nombre de mois travaillés
 * @returns {number} Nombre de JC acquis (plafonné à 30)
 */
export function calculateAccruedDays(monthsWorked) {
  const dailyAccrual = 2.5; // 2,5 JC par mois
  const maxDays = 30; // Plafond annuel
  
  const accrued = monthsWorked * dailyAccrual;
  return Math.min(accrued, maxDays);
}

/**
 * Vérifie si une date est dans la période de congés individuels (Jan-Nov)
 * @param {string} date - Date à vérifier (format YYYY-MM-DD)
 * @returns {boolean}
 */
export function isIndividualLeavePeriod(date) {
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  return month >= 0 && month <= 10; // Janvier (0) à Novembre (10)
}

/**
 * Vérifie si une date est dans la période de congé collectif (Décembre)
 * @param {string} date - Date à vérifier (format YYYY-MM-DD)
 * @returns {boolean}
 */
export function isCollectiveLeavePeriod(date) {
  const d = new Date(date);
  const month = d.getMonth();
  return month === 11; // Décembre
}