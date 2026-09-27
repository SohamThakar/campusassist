import React from 'react';

export const PriorityBadge = ({ priority, size = 'md' }) => {
  const prio = priority || 'Medium';

  const styles = {
    Critical: 'bg-red-100 text-red-700 border-red-200 ring-1 ring-red-400/30',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const dots = {
    Critical: 'bg-red-500 animate-ping',
    High: 'bg-orange-500',
    Medium: 'bg-amber-500',
    Low: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  };

  const currentStyle = styles[prio] || styles.Medium;
  const currentDot = dots[prio] || dots.Medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${currentStyle} ${sizeClasses[size]} transition-all`}
    >
      <span className="relative flex h-2 w-2">
        {prio === 'Critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${currentDot}`}></span>
      </span>
      {prio}
    </span>
  );
};
