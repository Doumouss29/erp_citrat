/**
 * Convertit les heures décimales en format heures:minutes
 * @param {number} hours - Nombre d'heures en décimal (ex: 8.13)
 * @returns {string} - Format "8h 08min" ou "8h" si pas de minutes
 */
export const formatHoursMinutes = (hours) => {
  const totalMinutes = Math.abs(hours * 60);
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)}min`;
  }
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

/**
 * Convertit les heures décimales en format heures:minutes avec signe
 * @param {number} hours - Nombre d'heures en décimal (ex: 1.5 ou -0.75)
 * @returns {string} - Format "+1h 30min" ou "-45min"
 */
export const formatHoursMinutesWithSign = (hours) => {
  const sign = hours >= 0 ? '+' : '-';
  return sign + formatHoursMinutes(Math.abs(hours));
};