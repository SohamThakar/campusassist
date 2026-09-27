import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'positive', // 'positive' | 'negative' | 'neutral'
  icon: Icon,
  subtext,
  highlight = false,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-card transition-all hover:shadow-card-hover ${
        highlight ? 'border-brand-500/50 bg-gradient-to-br from-white to-brand-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              changeType === 'positive'
                ? 'text-emerald-600'
                : changeType === 'negative'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          >
            {changeType === 'positive' && <ArrowUpRight className="h-3.5 w-3.5" />}
            {changeType === 'negative' && <ArrowDownRight className="h-3.5 w-3.5" />}
            {changeType === 'neutral' && <Minus className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-500">{subtext}</p>
      )}
    </div>
  );
};
