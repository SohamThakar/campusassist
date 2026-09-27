import React from 'react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const st = (status || 'submitted').toLowerCase();

  const config = {
    submitted: {
      label: 'Submitted',
      style: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    },
    approved: {
      label: 'Approved',
      style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500',
    },
    assigned: {
      label: 'Assigned',
      style: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500',
    },
    in_progress: {
      label: 'In Progress',
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    completed: {
      label: 'Completed',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    rejected: {
      label: 'Rejected',
      style: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
  };

  const item = config[st] || config.submitted;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${item.style} ${sizeClasses[size]} font-medium`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.dot}`}></span>
      {item.label}
    </span>
  );
};
