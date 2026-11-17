import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function StatutDonut({ data = [] }) {
  const total = data.reduce((s, e) => s + e.value, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              label={false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              formatter={(value, name) => [`${value} dossiers`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Légende avec pourcentages */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-2">
        {data.map((entry, index) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }} />
              <span className="text-xs text-slate-700 font-medium truncate">{entry.name}</span>
              <span className="text-xs text-slate-500 ml-auto font-semibold">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}