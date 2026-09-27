import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Activity, 
  ChevronRight,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsAPI, complaintsAPI } from '../../api/endpoints';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatCard } from '../../components/common/StatCard';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import { VolumeTrendLineChart } from '../../components/charts/VolumeTrendLineChart';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRCodeGeneratorModal } from '../../components/common/QRCodeGeneratorModal';

export const FacilitiesOverviewPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, compRes] = await Promise.all([
          analyticsAPI.getAuthorityStats(),
          complaintsAPI.list({ limit: 8 }),
        ]);
        setStats(statsRes.data);
        setComplaints(compRes.data);
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = complaints.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.complaint_id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Campus Facilities Overview" onSearch={setSearchQuery} />

      <div className="flex-1 flex">
        <Sidebar role="authority" />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Campus Facilities Overview
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all"
              >
                <QrCode className="h-3.5 w-3.5 text-[#0f6fb0]" /> Generate Location QR
              </button>
              <Link
                to="/authority/queue"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fb0] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c598d] shadow-sm transition-all"
              >
                Go to Approval Queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Active Requests"
              value={(stats?.new_complaints ?? 0) + (stats?.in_progress ?? 0)}
              change={stats?.new_complaints > 0 ? `${stats.new_complaints} awaiting assignment` : 'Queue clear'}
              changeType={stats?.new_complaints > 0 ? 'positive' : 'neutral'}
              icon={Activity}
              subtext="Open campus maintenance requests"
            />
            <StatCard
              title="In Progress"
              value={stats?.in_progress ?? 0}
              change={stats?.in_progress > 0 ? 'Active assignments' : 'No active assignments'}
              changeType="neutral"
              icon={Clock}
              subtext="Currently being worked on"
            />
            <StatCard
              title="Completed"
              value={stats?.completed ?? 0}
              change={stats?.completed > 0 ? 'SLA performance tracked' : 'No completions yet'}
              changeType={stats?.completed > 0 ? 'positive' : 'neutral'}
              icon={CheckCircle2}
              subtext="Total resolved requests"
            />
          </div>

          {/* Charts Row: Category Breakdown Donut (Left) + Volume Trends Area/Line (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Breakdown Donut Card */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Category Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-400">Distribution by trade discipline</p>
                </div>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>

              <CategoryDonutChart data={stats?.category_breakdown} height={230} />
            </div>

            {/* Volume Trends Area/Line Chart Card */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Volume Trends (Jan – Jun)
                  </h3>
                  <p className="text-[11px] text-slate-400">Monthly tickets logged vs resolved</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  94.2% SLA
                </span>
              </div>

              <VolumeTrendLineChart data={stats?.volume_trends} height={230} />
            </div>
          </div>

          {/* Recent Maintenance Requests Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Maintenance Requests
                </h3>
                <p className="text-[11px] text-slate-400">Active campus maintenance requests</p>
              </div>

              <Link
                to="/authority/queue"
                className="text-xs font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
              >
                View Full Queue <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((item) => (
                    <tr
                      key={item.complaint_id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/authority/queue/${encodeURIComponent(item.complaint_id)}`)}
                    >
                      <td className="py-3 px-4 font-bold text-brand-700 whitespace-nowrap">
                        {item.complaint_id}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        📍 {item.location}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/authority/queue/${encodeURIComponent(item.complaint_id)}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800"
                        >
                          Review <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <QRCodeGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
