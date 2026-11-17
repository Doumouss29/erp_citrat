import { base44 } from "@/api/base44Client";
import { differenceInMinutes, parseISO, format } from "date-fns";
import { invalidateEmployees } from "@/lib/rhSession";

/**
 * Fonction principale de synchronisation et vérification des données RH
 * Vérifie et corrige : horaires, cumuls, balances, soldes congés, soldes absences
 */
export async function syncAllData() {
  console.log("🔄 Début de la synchronisation complète des données...");
  
  const results = {
    workLogs: { checked: 0, fixed: 0, errors: [] },
    leaveBalances: { checked: 0, fixed: 0, errors: [] },
    absenceBalances: { checked: 0, fixed: 0, errors: [] },
    summary: ""
  };

  try {
    // 1. Synchroniser les logs de travail (horaires, cumuls, balances)
    await syncWorkLogs(results);
    
    // 2. Synchroniser les soldes de congés
    await syncLeaveBalances(results);
    
    // 3. Synchroniser les soldes d'absences
    await syncAbsenceBalances(results);
    
    results.summary = `✅ Synchronisation terminée: ${results.workLogs.fixed + results.leaveBalances.fixed + results.absenceBalances.fixed} correction(s)`;
    console.log(results.summary);
    
  } catch (error) {
    results.summary = `❌ Erreur lors de la synchronisation: ${error.message}`;
    console.error(results.summary, error);
  }
  
  return results;
}

/**
 * Synchronise les logs de travail quotidiens (heures, balance, cumul)
 */
async function syncWorkLogs(results) {
  console.log("📊 Synchronisation des logs de travail...");
  
  try {
    const [allEmployees, allTimeEntries, allWorkLogs] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.TimeEntry.list(),
      base44.entities.DailyWorkLog.list()
    ]);

    // Grouper les entrées par employé et par date
    const entriesByEmployeeAndDate = {};
    allTimeEntries.forEach(entry => {
      const key = `${entry.employee_code}_${entry.date}`;
      if (!entriesByEmployeeAndDate[key]) {
        entriesByEmployeeAndDate[key] = [];
      }
      entriesByEmployeeAndDate[key].push(entry);
    });

    // Pour chaque employé
    for (const employee of allEmployees) {
      const employeeEntries = allTimeEntries.filter(e => e.employee_code === employee.employee_code);
      const uniqueDates = [...new Set(employeeEntries.map(e => e.date))].sort();

      let cumulativeBalance = 0;

      for (const date of uniqueDates) {
        results.workLogs.checked++;
        const key = `${employee.employee_code}_${date}`;
        const dayEntries = entriesByEmployeeAndDate[key] || [];
        
        const entry = dayEntries.find(e => e.entry_type === "entry");
        const exit = dayEntries.find(e => e.entry_type === "exit");

        if (entry && exit) {
          // Calculer les heures travaillées
          const [entryH, entryM] = entry.time.split(':').map(Number);
          const [exitH, exitM] = exit.time.split(':').map(Number);
          const entryMinutes = entryH * 60 + entryM;
          const exitMinutes = exitH * 60 + exitM;
          const minutesWorked = exitMinutes - entryMinutes;
          const hoursWorked = parseFloat((minutesWorked / 60).toFixed(2));
          const balance = parseFloat((hoursWorked - 8).toFixed(2));
          cumulativeBalance += balance;
          const finalCumulativeBalance = parseFloat(cumulativeBalance.toFixed(2));

          // Vérifier si un log existe déjà
          const existingLog = allWorkLogs.find(
            log => log.employee_code === employee.employee_code && log.date === date
          );

          const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name;

          const correctData = {
            employee_id: employee.id,
            employee_code: employee.employee_code,
            employee_name: employeeName,
            date: date,
            entry_time: entry.time,
            exit_time: exit.time,
            hours_worked: hoursWorked,
            balance: balance,
            cumulative_balance: finalCumulativeBalance
          };

          // Vérifier si les données sont correctes
          const needsUpdate = !existingLog || 
            existingLog.hours_worked !== hoursWorked ||
            existingLog.balance !== balance ||
            existingLog.cumulative_balance !== finalCumulativeBalance ||
            existingLog.entry_time !== entry.time ||
            existingLog.exit_time !== exit.time;

          if (needsUpdate) {
            if (existingLog) {
              await base44.entities.DailyWorkLog.update(existingLog.id, correctData);
              console.log(`✅ Log corrigé pour ${employee.employee_code} le ${date}: ${hoursWorked}h (${balance >= 0 ? '+' : ''}${balance}h)`);
            } else {
              await base44.entities.DailyWorkLog.create(correctData);
              console.log(`✅ Log créé pour ${employee.employee_code} le ${date}: ${hoursWorked}h`);
            }
            results.workLogs.fixed++;
          }
        }
      }
    }

    console.log(`✅ Logs de travail vérifiés: ${results.workLogs.checked}, corrigés: ${results.workLogs.fixed}`);
  } catch (error) {
    results.workLogs.errors.push(error.message);
    console.error("❌ Erreur synchronisation logs:", error);
  }
}

// Règles communes avec le décompte à l'approbation (fonction rhRequest) et la fonction
// serveur syncLeaveBalances : demandes APPROUVÉES de l'année en cours, rattachées par
// identifiant d'employé (sinon par e-mail). Limites explicites : le SDK plafonne à 50 par défaut.
const BALANCE_LIMIT = 10000;
const isDecemberLeave = (leave) => leave.leave_period === "collectif" || leave.leave_period === "decembre";
const inCurrentYear = (r) => String(r.start_date || "").slice(0, 4) === String(new Date().getFullYear());
const belongsToEmployee = (employee) => (r) =>
  r.employee_id === employee.id ||
  (!r.employee_id && !!employee.email &&
    String(r.employee_email || r.created_by || "").toLowerCase() === employee.email.toLowerCase());
const sumDays = (list) => list.reduce((s, r) => s + (Number(r.total_days) || 0), 0);

/**
 * Synchronise les soldes de congés (année + décembre)
 */
async function syncLeaveBalances(results) {
  try {
    const [allEmployees, approvedLeaves] = await Promise.all([
      base44.entities.Employee.list("-created_date", BALANCE_LIMIT),
      base44.entities.LeaveRequest.filter({ status: "approved" }, "-start_date", BALANCE_LIMIT)
    ]);
    const leaves = approvedLeaves.filter(inCurrentYear);

    for (const employee of allEmployees) {
      results.leaveBalances.checked++;
      if (employee.contract_type === "Prestation") continue; // pas de solde de congés

      const employeeLeaves = leaves.filter(belongsToEmployee(employee));
      // Congés individuels (et autres périodes) sur l'année, collectifs sur décembre ; base 15 j chacun
      const correctYearDays = Math.max(0, 15 - sumDays(employeeLeaves.filter((l) => !isDecemberLeave(l))));
      const correctDecemberDays = Math.max(0, 15 - sumDays(employeeLeaves.filter(isDecemberLeave)));

      const currentYearDays = employee.remaining_year_days ?? 15;
      const currentDecemberDays = employee.remaining_december_days ?? 15;

      if (currentYearDays !== correctYearDays || currentDecemberDays !== correctDecemberDays) {
        await base44.entities.Employee.update(employee.id, {
          remaining_year_days: correctYearDays,
          remaining_december_days: correctDecemberDays
        }); invalidateEmployees();
        results.leaveBalances.fixed++;
      }
    }
  } catch (error) {
    results.leaveBalances.errors.push(error.message);
    console.error("Erreur synchronisation congés:", error);
  }
}

/**
 * Synchronise les soldes d'absences (jours ouvrés enregistrés à l'approbation, plafond 10 j)
 */
async function syncAbsenceBalances(results) {
  try {
    const [allEmployees, approvedAbsences] = await Promise.all([
      base44.entities.Employee.list("-created_date", BALANCE_LIMIT),
      base44.entities.Absence.filter({ status: "approved" }, "-start_date", BALANCE_LIMIT)
    ]);
    const absences = approvedAbsences.filter(inCurrentYear);

    for (const employee of allEmployees) {
      results.absenceBalances.checked++;
      if (employee.contract_type === "Prestation") continue;

      const totalAbsenceDays = Math.min(10, sumDays(absences.filter(belongsToEmployee(employee))));
      if ((employee.absence_days_used || 0) !== totalAbsenceDays) {
        await base44.entities.Employee.update(employee.id, { absence_days_used: totalAbsenceDays }); invalidateEmployees();
        results.absenceBalances.fixed++;
      }
    }
  } catch (error) {
    results.absenceBalances.errors.push(error.message);
    console.error("Erreur synchronisation absences:", error);
  }
}

/**
 * Fonction de vérification rapide (sans correction)
 */
export async function verifyDataIntegrity() {
  console.log("🔍 Vérification de l'intégrité des données...");
  
  const issues = {
    workLogs: [],
    leaves: [],
    absences: []
  };

  try {
    const [allEmployees, allTimeEntries, allWorkLogs, approvedLeaves, approvedAbsences] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.TimeEntry.list(),
      base44.entities.DailyWorkLog.list(),
      base44.entities.LeaveRequest.filter({ status: "approved" }),
      base44.entities.Absence.filter({ status: "approved" })
    ]);

    // Vérifier les logs de travail
    for (const log of allWorkLogs) {
      if (log.hours_worked < 0 || log.hours_worked > 24) {
        issues.workLogs.push(`${log.employee_name} (${log.date}): heures invalides (${log.hours_worked}h)`);
      }
      if (Math.abs(log.balance) > 16) {
        issues.workLogs.push(`${log.employee_name} (${log.date}): balance suspecte (${log.balance}h)`);
      }
    }

    // Vérifier les soldes de congés
    for (const employee of allEmployees) {
      if (employee.remaining_year_days < -30 || employee.remaining_year_days > 30) {
        issues.leaves.push(`${employee.full_name}: solde année suspect (${employee.remaining_year_days}j)`);
      }
      if (employee.remaining_december_days < -30 || employee.remaining_december_days > 30) {
        issues.leaves.push(`${employee.full_name}: solde décembre suspect (${employee.remaining_december_days}j)`);
      }
    }

    // Vérifier les soldes d'absences
    for (const employee of allEmployees) {
      if (employee.absence_days_used < 0 || employee.absence_days_used > 100) {
        issues.absences.push(`${employee.full_name}: jours d'absence suspects (${employee.absence_days_used}j)`);
      }
    }

    const totalIssues = issues.workLogs.length + issues.leaves.length + issues.absences.length;
    
    if (totalIssues === 0) {
      console.log("✅ Aucun problème détecté");
    } else {
      console.log(`⚠️ ${totalIssues} problème(s) détecté(s):`);
      issues.workLogs.forEach(i => console.log(`  - ${i}`));
      issues.leaves.forEach(i => console.log(`  - ${i}`));
      issues.absences.forEach(i => console.log(`  - ${i}`));
    }

    return issues;
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    return issues;
  }
}