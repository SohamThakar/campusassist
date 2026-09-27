import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

export const CategoryDonutChart = ({ data = [], height = 240 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const defaultColors = ['#0f6fb0', '#06b6d4', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#6366f1'];

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
          <PieChartIcon className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-xs font-semibold text-slate-400">No complaint data yet</p>
        <p className="text-[11px] text-slate-300 mt-0.5">Chart will populate once complaints are submitted</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs">
          <div className="font-semibold text-slate-800">{item.name}</div>
          <div className="text-slate-600 mt-0.5">
            {item.value} complaint{item.value !== 1 ? 's' : ''} ({item.percentage || ((item.value / total) * 100).toFixed(1)}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || defaultColors[index % defaultColors.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">{total}</span>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color || defaultColors[idx % defaultColors.length] }}
            />
            <span className="text-slate-600 truncate">{item.name}:</span>
            <span className="font-semibold text-slate-800">{item.percentage || Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
