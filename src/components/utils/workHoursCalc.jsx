/**
 * Calcule les heures travaillées selon les règles CITRAT:
 * - Fenêtre normale : 08:00 → 17:00
 * - Si entrée < 08:00 : ne pas compter avant 08:00
 * - Si sortie > 17:00 : le temps après 17:00 est en heures supplémentaires
 * - Mode forfait (2 pointages) : déduction systématique d'1h de pause
 * - Mode pause réelle (4 pointages) : déduction de la pause réelle si >= 30 min
 * - Empêcher les temps négatifs
 *
 * @param {string} entryTime - Heure d'entrée format "HH:MM"
 * @param {string} exitTime - Heure de sortie format "HH:MM"
 * @param {string|null} breakStartTime - Heure de début de pause "HH:MM" (optionnel)
 * @param {string|null} breakEndTime - Heure de fin de pause "HH:MM" (optionnel)
 * @returns {object} { hoursWorked, overtimeHours, balance, breakMode, breakDuration }
 */
export function calculateWorkHours(entryTime, exitTime, breakStartTime = null, breakEndTime = null) {
  if (!entryTime || !exitTime) {
    return { hoursWorked: 0, overtimeHours: 0, balance: -8, breakMode: 'forfait', breakDuration: 1 };
  }

  const parseTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const entryMinutes = parseTime(entryTime);
  const exitMinutes = parseTime(exitTime);

  if (exitMinutes <= entryMinutes) {
    return { hoursWorked: 0, overtimeHours: 0, balance: -8, breakMode: 'forfait', breakDuration: 1 };
  }

  const WORK_START = 8 * 60;   // 08:00 en minutes
  const WORK_END = 17 * 60;    // 17:00 en minutes
  const FORFAIT_BREAK = 60;   // 1 heure de pause forfaitaire
  const MIN_REAL_BREAK = 30;  // 30 min minimum pour valider une pause réelle

  const adjustedEntry = Math.max(entryMinutes, WORK_START);
  const normalWorkEnd = Math.min(exitMinutes, WORK_END);

  let normalWorkMinutes = 0;
  let breakMode = 'forfait';
  let breakDurationMinutes = FORFAIT_BREAK;

  // Détection du mode pause réelle (4 pointages)
  const hasRealBreak = breakStartTime && breakEndTime;
  if (hasRealBreak) {
    const breakStart = parseTime(breakStartTime);
    const breakEnd = parseTime(breakEndTime);

    // La pause doit être cohérente et >= 30 min pour être utilisée
    if (breakEnd > breakStart && breakStart >= entryMinutes && breakEnd <= exitMinutes) {
      const realBreakDuration = breakEnd - breakStart;
      if (realBreakDuration >= MIN_REAL_BREAK) {
        breakMode = 'real';
        breakDurationMinutes = realBreakDuration;
        const morning = Math.max(0, Math.min(breakStart, WORK_END) - adjustedEntry);
        const afternoon = Math.max(0, normalWorkEnd - Math.max(breakEnd, WORK_START));
        normalWorkMinutes = Math.max(0, morning + afternoon);
      }
    }
  }

  // Mode forfait (2 pointages ou pause réelle invalide)
  if (breakMode === 'forfait') {
    if (normalWorkEnd > adjustedEntry) {
      normalWorkMinutes = Math.max(0, normalWorkEnd - adjustedEntry - FORFAIT_BREAK);
    }
  }

  // Heures supplémentaires (après 17:00)
  let overtimeMinutes = 0;
  if (exitMinutes > WORK_END) {
    overtimeMinutes = exitMinutes - WORK_END;
  }

  const hoursWorked = Math.round((normalWorkMinutes / 60) * 100) / 100;
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
  const balance = Math.round((hoursWorked - 8) * 100) / 100;
  const breakDuration = Math.round((breakDurationMinutes / 60) * 100) / 100;

  return {
    hoursWorked: Math.max(0, hoursWorked),
    overtimeHours: Math.max(0, overtimeHours),
    balance: balance,
    breakMode: breakMode,
    breakDuration: breakDuration
  };
}

/**
 * Formate le temps en heures et minutes
 */
export function formatHours(hours) {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
}
