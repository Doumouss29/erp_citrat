import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  'Initial': '#94a3b8',
  'Réservé': '#f59e0b',
  'Achat temporaire': '#3b82f6',
  'Vendu': '#22c55e'
};

export default function StatutChart({ lots = [] }) {
  const data = Object.entries(
    lots.reduce((acc, lot) => {
      const statut = lot.statut || 'Initial';
      acc[statut] = (acc[statut] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const total = lots.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Répartition par statut</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { name, value } = payload[0].payload;
                    const percent = ((value / total) * 100).toFixed(1);
                    return (
                      <div className="bg-white shadow-lg rounded-lg p-3 border">
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-slate-500">
                          {value} lots ({percent}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[item.name] }}
              />
              <span className="text-xs text-slate-600">{item.name}</span>
              <span className="text-xs font-medium text-slate-900 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}