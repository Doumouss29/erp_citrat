import React, { useMemo } from "react";
import { Users, Calendar, Briefcase, Building2, FileText, Badge as BadgeIcon, GraduationCap, MapPin, PieChart } from "lucide-react";
import { BarChart, Bar, PieChart as RechartPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

// Charte RH-CITRAT : vert pétrole, doré et nuances
const COLORS = ['#137f8c', '#c9a24f', '#0d5c66', '#6facb6', '#e2c48a', '#4095a1', '#8a6d2f', '#a3c8ce'];
const TEAL = '#0d5c66';
const GOLD = '#d4af6a';

export default function DemographicKPIs({ employees }) {
  const stats = useMemo(() => {
    if (!employees || employees.length === 0) return null;

    const active = employees.filter(e => e.is_active);
    const today = new Date();

    // Calcul ancienneté
    const calculateSeniority = (hireDate) => {
      if (!hireDate) return null;
      const hired = new Date(hireDate);
      const years = (today - hired) / (365.25 * 24 * 60 * 60 * 1000);
      return years;
    };

    // Groupements
    const byDepartment = {};
    const byPosition = {};
    const byCSP = {};
    const bySite = {};
    const byOffice = {};
    const byContract = {};
    const bySeniority = { "<1an": 0, "1-3ans": 0, "3-5ans": 0, "+5ans": 0 };
    const byAge = { "<25": 0, "25-35": 0, "35-45": 0, "45-55": 0, "+55": 0 };
    const byGender = { "Homme": 0, "Femme": 0, "Non renseigné": 0 };

    let totalAge = 0;
    let ageCount = 0;
    let totalSalaries = 0;
    let totalInterns = 0;

    active.forEach(emp => {
      // Département
      byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1;

      // Poste
      byPosition[emp.position] = (byPosition[emp.position] || 0) + 1;

      // CSP - Inclure les stagiaires (contract_type === "Stage" OR internship_type)
      let csp = emp.socio_professional_category || "Non renseigné";
      if (emp.contract_type === "Stage" || emp.internship_type) {
        csp = "Stagiaire";
      }
      byCSP[csp] = (byCSP[csp] || 0) + 1;

      // Site
      bySite[emp.office] = (bySite[emp.office] || 0) + 1;

      // Bureau
      const office = emp.office || "Non défini";
      if (!byOffice[office]) {
        byOffice[office] = { salaries: 0, stagiaires: 0, total: 0, hommes: 0, femmes: 0 };
      }
      byOffice[office].total++;
      if (emp.gender === "Homme") byOffice[office].hommes++;
      else if (emp.gender === "Femme") byOffice[office].femmes++;

      // Type de contrat - Identifier les stagiaires
      const isStage = emp.contract_type === "Stage" || emp.internship_type;
      const contractType = (emp.contract_type === "CDD" && emp.internship_type) ? "Stage" : emp.contract_type;
      byContract[contractType] = (byContract[contractType] || 0) + 1;

      if (isStage) {
        byOffice[office].stagiaires++;
        totalInterns++;
      } else {
        byOffice[office].salaries++;
        totalSalaries++;
      }

      // Ancienneté
      const seniority = calculateSeniority(emp.hire_date);
      if (seniority !== null) {
        if (seniority < 1) bySeniority["<1an"]++;
        else if (seniority < 3) bySeniority["1-3ans"]++;
        else if (seniority < 5) bySeniority["3-5ans"]++;
        else bySeniority["+5ans"]++;
      }

      // Âge
      if (emp.birth_date) {
        const birth = new Date(emp.birth_date);
        const age = today.getFullYear() - birth.getFullYear();
        if (age < 25) byAge["<25"]++;
        else if (age < 35) byAge["25-35"]++;
        else if (age < 45) byAge["35-45"]++;
        else if (age < 55) byAge["45-55"]++;
        else byAge["+55"]++;

        totalAge += age;
        ageCount++;
      }

      // Genre
      const gender = emp.gender || "Non renseigné";
      byGender[gender]++;
    });

    const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : "N/A";

    return {
      totalActive: active.length,
      // Effectif = personnel actif uniquement (anciens agents et fiches d'archive exclus),
      // pour que Total = Salariés + Stagiaires
      totalEmployees: active.length,
      totalSalaries,
      totalInterns,
      byDepartment,
      byPosition,
      byCSP,
      bySite,
      byOffice,
      byContract,
      bySeniority,
      byAge,
      byGender,
      avgAge
    };
  }, [employees]);

  if (!stats) return null;

  // Préparer les données pour les graphiques
  const cspData = Object.entries(stats.byCSP).map(([name, value]) => ({ name, value }));
  const siteData = Object.entries(stats.bySite).map(([name, value]) => ({ name, value }));
  const contractData = Object.entries(stats.byContract).map(([name, value]) => ({ name: name === "Stage" ? "STAGE" : name, value }));
  const seniorityData = Object.entries(stats.bySeniority).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(stats.byAge).map(([name, value]) => ({ name, value }));
  const genderData = Object.entries(stats.byGender).map(([name, value]) => ({ name, value }));
  
  const genderChartData = [
    { name: "Hommes", value: stats.byGender["Homme"] || 0, color: "#137f8c" },
    { name: "Femmes", value: stats.byGender["Femme"] || 0, color: "#c9a24f" }
  ];

  const employeeTypeData = [
    { name: "Salariés", value: stats.totalSalaries, color: "#0d5c66" },
    { name: "Stagiaires", value: stats.totalInterns, color: "#d4af6a" }
  ];

  const pct = (n) => (stats.totalEmployees ? Math.round((n / stats.totalEmployees) * 100) : 0);
  const offices = Object.entries(stats.byOffice).sort((a, b) => b[1].total - a[1].total);

  // Tuile du bandeau
  const BandTile = ({ label, value, sub, Icon, badge }) => (
    <div className="rounded-xl bg-white ring-1 ring-[#DFE8EA] p-2.5 sm:p-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#F6EBD5]" style={{ color: "#A7792E" }}><Icon className="w-4 h-4" /></span>
        {badge && <span className="rounded-full text-[11px] font-bold px-2 py-0.5" style={{ background: "#E8F2F3", color: "#0D5C66" }}>{badge}</span>}
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#667A82] truncate">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums text-[#0D5C66] leading-none">{value}</p>
      {sub && <p className="hidden xl:block mt-1 text-[11px] text-[#667A82] truncate">{sub}</p>}
    </div>
  );

  // Carte de graphique aux couleurs RH
  const ChartCard = ({ title, Icon = PieChart, children, delay = 0 }) => (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#0d5c66]/10"
      style={{ background: "linear-gradient(180deg,#f1f6f7 0%,#ffffff 55%)" }}>
      <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 border-b border-[#0d5c66]/10">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ background: TEAL, color: GOLD }}><Icon className="w-4 h-4" /></span>
        <h3 className="text-base font-bold" style={{ color: TEAL }}>{title}</h3>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  );

  const Legend2 = ({ items }) => (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {items.map((it) => (
        <div key={it.name} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "rgba(13,92,102,0.05)" }}>
          <span className="flex items-center gap-2 text-sm text-slate-600"><span className="w-3 h-3 rounded-full" style={{ background: it.color }} />{it.name}</span>
          <span className="font-bold tabular-nums" style={{ color: TEAL }}>{it.value}</span>
        </div>
      ))}
    </div>
  );

  const Donut = ({ data }) => (
    <ResponsiveContainer width="100%" height={200}>
      <RechartPie>
        <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value" stroke="none">
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
        </Pie>
        <Tooltip />
      </RechartPie>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      {/* Bandeau des indicateurs clés */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl shadow-sm border border-[#DFE8EA] p-3 sm:p-4"
        style={{ background: "#F3F7F8" }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl" style={{ background: "rgba(13,92,102,0.025)" }} aria-hidden />
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} aria-hidden />
        <div className="relative flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#A7792E" }}>Effectif actif · indicateurs clés</p>
        </div>
        <div className="relative grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <BandTile label="Total employés" value={stats.totalEmployees} sub="Personnel actif" Icon={Users} />
          <BandTile label="Salariés" value={stats.totalSalaries} Icon={Briefcase} badge={`${pct(stats.totalSalaries)}%`} />
          <BandTile label="Stagiaires" value={stats.totalInterns} Icon={GraduationCap} badge={`${pct(stats.totalInterns)}%`} />
          <BandTile label="Bureaux" value={offices.length} Icon={MapPin} />
          <BandTile label="Âge moyen" value={`${stats.avgAge} ans`} Icon={Calendar} />
          <BandTile label="Postes distincts" value={Object.keys(stats.byPosition).length} sub={`${Object.keys(stats.byDepartment).length} départements`} Icon={FileText} />
        </div>
      </motion.section>

      {/* Genre & type d'employés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Répartition par genre" delay={0.1}>
          <Donut data={genderChartData} />
          <Legend2 items={genderChartData} />
        </ChartCard>
        <ChartCard title="Type d'employés" delay={0.15}>
          <Donut data={employeeTypeData} />
          <Legend2 items={employeeTypeData} />
        </ChartCard>
      </div>

      {/* Répartition par bureau */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F2F3", color: "#0D5C66" }}><Building2 className="w-4 h-4" /></span>
          <h3 className="text-base font-semibold" style={{ color: TEAL }}>Répartition par bureau</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {offices.map(([office, data], index) => {
            const share = (n) => (data.total ? (n / data.total) * 100 : 0);
            return (
              <motion.div key={office} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * index }}
                className="rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-[#DFE8EA]">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#DFE8EA]" style={{ background: "#F3F7F8" }}>
                  <span className="flex items-center gap-2 min-w-0 text-[#0D5C66] font-semibold text-sm">
                    <Building2 className="w-4 h-4 flex-none" style={{ color: "#B68C42" }} /><span className="truncate">{office}</span>
                  </span>
                  <span className="rounded-full text-xs font-semibold px-2.5 py-0.5" style={{ background: "#F6EBD5", color: "#8C6528" }}>{data.total}</span>
                </div>
                <div className="p-3 space-y-2.5">
                  {[["Salariés", data.salaries, "#0d5c66"], ["Stagiaires", data.stagiaires, "#c9a24f"]].map(([l, n, c]) => (
                    <div key={l}>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">{l}</span><span className="font-semibold tabular-nums" style={{ color: TEAL }}>{n}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,92,102,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${share(n)}%`, background: c }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[#DFE8EA] text-xs sm:text-sm">
                    <span className="text-slate-500">Hommes / Femmes</span>
                    <span className="font-semibold tabular-nums" style={{ color: TEAL }}>{data.hommes} / {data.femmes}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* CSP & contrats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pyramide des qualifications" Icon={BadgeIcon} delay={0.25}>
          {(() => {
            // Hiérarchie officielle, du sommet à la base ; stagiaires et non renseignés à part
            const LEVELS = [
              { key: "Cadre Supérieur", color: "#0e4b53" },
              { key: "Cadre", color: "#0d5c66" },
              { key: "Agent de Maîtrise", color: "#137f8c" },
              { key: "Employé Qualifié", color: "#4095a1" },
              { key: "Employé Non Qualifié", color: "#6facb6" },
              { key: "Ouvrier Qualifié", color: "#8fbcc4" },
              { key: "Ouvrier Non Qualifié", color: "#a3c8ce" },
            ];
            const count = (k) => stats.byCSP[k] || 0;
            const total = stats.totalActive || 1;
            const max = Math.max(1, ...LEVELS.map((l) => count(l.key)));
            const pctOf = (n) => Math.round((n / total) * 100);
            const groups = [
              { label: "Encadrement", n: count("Cadre Supérieur") + count("Cadre") },
              { label: "Maîtrise", n: count("Agent de Maîtrise") },
              { label: "Exécution", n: count("Employé Qualifié") + count("Employé Non Qualifié") + count("Ouvrier Qualifié") + count("Ouvrier Non Qualifié") },
            ];
            const extras = [
              { label: "Stagiaires", n: count("Stagiaire"), color: GOLD },
              { label: "Non renseigné", n: count("Non renseigné"), color: "#cbd5e1" },
            ].filter((e) => e.n > 0);
            return (
              <div>
                {/* Synthèse en 3 groupes */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {groups.map((g) => (
                    <div key={g.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(13,92,102,0.06)" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.label}</p>
                      <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: TEAL }}>{pctOf(g.n)}<span className="text-sm">%</span></p>
                      <p className="text-xs text-slate-500">{g.n} agent{g.n > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>

                {/* Pyramide : barres centrées, largeur proportionnelle à l'effectif */}
                <div className="space-y-1.5">
                  {LEVELS.map((l) => {
                    const n = count(l.key);
                    const w = n ? Math.max(6, (n / max) * 100) : 0;
                    return (
                      <div key={l.key} className="grid grid-cols-[minmax(0,6.5rem)_1fr_2.5rem] sm:grid-cols-[minmax(0,9.5rem)_1fr_3.5rem] items-center gap-2 sm:gap-3">
                        <span className={`text-xs sm:text-sm truncate ${n ? "font-semibold text-slate-700" : "text-slate-400"}`}>{l.key}</span>
                        <div className="h-7 flex justify-center rounded-md" style={{ background: "rgba(13,92,102,0.04)" }}>
                          {n > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.7 }}
                              className="h-full rounded-md flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: l.color }}>
                              {w > 12 ? n : ""}
                            </motion.div>
                          )}
                        </div>
                        <span className="text-right text-xs font-bold tabular-nums" style={{ color: n ? TEAL : "#cbd5e1" }}>
                          {n ? `${pctOf(n)}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {extras.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#0d5c66]/10 flex flex-wrap gap-2">
                    {extras.map((e) => (
                      <span key={e.label} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-slate-600" style={{ background: "rgba(13,92,102,0.05)" }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                        {e.label} : <span className="font-bold" style={{ color: TEAL }}>{e.n}</span> ({pctOf(e.n)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </ChartCard>

        <ChartCard title="Répartition par type de contrat" Icon={FileText} delay={0.3}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contractData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,92,102,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(13,92,102,0.05)" }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {contractData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}