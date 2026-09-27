import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Filter,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
} from 'lucide-react';
import { analyticsAPI } from '../../api/endpoints';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatCard } from '../../components/common/StatCard';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import { VolumeTrendLineChart } from '../../components/charts/VolumeTrendLineChart';
import { StatusBadge } from '../../components/common/StatusBadge';

const CATEGORIES = [
  'Electrical', 'Plumbing', 'HVAC', 'Structural', 'Civil', 'Furniture', 'IT/Network', 'Cleaning', 'Other'
];
const STATUSES = ['submitted', 'approved', 'assigned', 'in_progress', 'completed', 'rejected'];

// Simple bar chart component using divs (no extra lib needed)
const SimpleBarChart = ({ data, colorKey = 'color', valueKey = 'value', nameKey = 'name', height = 160 }) => {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-xs text-slate-400">No data available</div>
  );
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[9px] font-bold text-slate-700">{item[valueKey]}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: max > 0 ? `${(item[valueKey] / max) * (height - 32)}px` : '4px',
              backgroundColor: item[colorKey] || '#0f6fb0',
              minHeight: '4px',
            }}
          />
          <span className="text-[8px] text-slate-500 truncate w-full text-center">{item[nameKey]}</span>
        </div>
      ))}
    </div>
  );
};

// Status color map for bar chart
const STATUS_COLORS = {
  submitted: '#f59e0b',
  approved: '#3b82f6',
  assigned: '#6366f1',
  in_progress: '#8b5cf6',
  completed: '#10b981',
  rejected: '#ef4444',
};

export const PrincipalReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await analyticsAPI.getPrincipalReports(params);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
    setCategoryFilter('');
  };

  const hasActiveFilters = dateFrom || dateTo || statusFilter || categoryFilter;

  // Prepare status data with colors
  const statusChartData = (data?.status_breakdown || []).map(item => ({
    ...item,
    color: STATUS_COLORS[item.name] || '#94a3b8',
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Principal Reports" />

      <div className="flex-1 flex">
        <Sidebar role="principal" />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Complaint Reports</h1>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  Principal Only
                </span>
                {hasActiveFilters && (
                  <span className="rounded-full bg-[#0f6fb0]/10 px-2.5 py-0.5 text-xs font-bold text-[#0f6fb0]">
                    Filtered
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'border-[#0f6fb0] bg-[#0f6fb0]/10 text-[#0f6fb0]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters {hasActiveFilters && '●'}
              </button>
              <button
                onClick={fetchReports}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Reports</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[10px] font-semibold text-rose-600 hover:text-rose-800">
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-[#0f6fb0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-[#0f6fb0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-[#0f6fb0] focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-[#0f6fb0] focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-[#0f6fb0] border-t-transparent animate-spin" />
              <span className="text-sm font-semibold text-slate-500">Loading reports...</span>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <StatCard
                  title="Total"
                  value={data?.total_complaints ?? 0}
                  change={hasActiveFilters ? 'Filtered result' : 'All time'}
                  changeType="neutral"
                />
                <StatCard
                  title="Pending"
                  value={data?.pending ?? 0}
                  change={data?.pending > 0 ? 'Awaiting review' : 'Queue clear'}
                  changeType={data?.pending > 0 ? 'negative' : 'neutral'}
                />
                <StatCard
                  title="In Progress"
                  value={data?.in_progress ?? 0}
                  change={data?.in_progress > 0 ? 'Active work' : 'None active'}
                  changeType="neutral"
                />
                <StatCard
                  title="Completed"
                  value={data?.completed ?? 0}
                  change={data?.completed > 0 ? 'Resolved' : 'None yet'}
                  changeType={data?.completed > 0 ? 'positive' : 'neutral'}
                />
                <StatCard
                  title="Rejected"
                  value={data?.rejected ?? 0}
                  change={data?.rejected > 0 ? 'Declined' : 'None rejected'}
                  changeType={data?.rejected > 0 ? 'negative' : 'neutral'}
                />
                <StatCard
                  title="High Priority"
                  value={data?.high_priority ?? 0}
                  change={data?.high_priority > 0 ? 'Critical + High' : 'None critical'}
                  changeType={data?.high_priority > 0 ? 'negative' : 'neutral'}
                />
                <StatCard
                  title="Avg. Resolution"
                  value={data?.avg_resolution_days > 0 ? `${data.avg_resolution_days}d` : 'N/A'}
                  change={data?.avg_resolution_days > 0 ? 'Based on completions' : 'No data'}
                  changeType="neutral"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Category Donut */}
                <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">By Category</h3>
                      <p className="text-[11px] text-slate-400">Distribution across types</p>
                    </div>
                  </div>
                  <CategoryDonutChart data={data?.category_breakdown} height={220} />
                </div>

                {/* Volume Trend */}
                <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Volume Trend (6 Months)</h3>
                      <p className="text-[11px] text-slate-400">Submitted vs resolved over time</p>
                    </div>
                  </div>
                  <VolumeTrendLineChart data={data?.volume_trends} height={220} />
                </div>
              </div>

              {/* Status Bar Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">By Status</h3>
                </div>
                <SimpleBarChart
                  data={statusChartData}
                  nameKey="name"
                  valueKey="value"
                  colorKey="color"
                  height={180}
                />
              </div>

              {/* Complaint Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      Complaint Log
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Showing {data?.complaints?.length ?? 0} of {data?.total_complaints ?? 0} complaints
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Ticket ID</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Evidence</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(!data?.complaints || data.complaints.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No complaints match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        data.complaints.map((c, idx) => (
                          <tr key={c.complaint_id || idx} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-bold text-[#0f6fb0]">{c.complaint_id}</td>
                            <td className="py-3 px-4 font-medium">{c.category}</td>
                            <td className="py-3 px-4 text-slate-500 max-w-[120px] truncate">📍 {c.location}</td>
                            <td className="py-3 px-4 text-slate-400 text-[10px]">{c.created_at}</td>
                            <td className="py-3 px-4">
                              {c.has_video ? (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full w-fit">
                                  <Video className="h-2.5 w-2.5" /> Video
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <StatusBadge status={c.status} size="sm" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
