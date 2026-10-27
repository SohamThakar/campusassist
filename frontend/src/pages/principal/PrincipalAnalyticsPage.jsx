import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Users, 
  ShieldAlert, 
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  Star,
  MessageSquare
} from 'lucide-react';
import { analyticsAPI } from '../../api/endpoints';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatCard } from '../../components/common/StatCard';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import { VolumeTrendLineChart } from '../../components/charts/VolumeTrendLineChart';
import { StatusBadge } from '../../components/common/StatusBadge';

export const PrincipalAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await analyticsAPI.getPrincipal();
        setData(res.data);
      } catch (err) {
        console.error('Error fetching principal analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Principal Executive Analytics & KPIs" />

      <div className="flex-1 flex">
        <Sidebar role="principal" />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Campus Facilities KPI Dashboard
                </h1>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  Read-Only Audit
                </span>
              </div>
            </div>
          </div>

          {/* 6 Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Requests"
              value={data?.total_complaints ?? 0}
              change={data?.total_complaints > 0 ? 'Institutional total' : 'No requests yet'}
              changeType="neutral"
            />
            <StatCard
              title="In Progress"
              value={data?.in_progress ?? 0}
              change={data?.in_progress > 0 ? 'Active queue' : 'Queue clear'}
              changeType="neutral"
            />
            <StatCard
              title="Completed"
              value={data?.completed ?? 0}
              change={data?.completed > 0 ? `${data.sla_compliance_rate ?? 100}% SLA` : 'No completions yet'}
              changeType={data?.completed > 0 ? 'positive' : 'neutral'}
            />
            <StatCard
              title="Avg. Resolution"
              value={data?.avg_resolution_days > 0 ? `${data.avg_resolution_days} days` : 'N/A'}
              change={data?.avg_resolution_days > 0 ? 'Based on real resolutions' : 'No data yet'}
              changeType="neutral"
            />
            <StatCard
              title="Active Providers"
              value={data?.active_providers ?? 0}
              change={data?.active_providers > 0 ? 'Verified technicians' : 'No providers yet'}
              changeType={data?.active_providers > 0 ? 'positive' : 'neutral'}
            />
            <StatCard
              title="Student Rating"
              value={data?.avg_student_rating > 0 ? `★ ${data.avg_student_rating}` : '★ 5.0'}
              change={data?.total_reviews > 0 ? `${data.total_reviews} student reviews` : 'Awaiting reviews'}
              changeType={data?.avg_student_rating >= 4.0 ? 'positive' : 'neutral'}
            />
          </div>

          {/* Charts Row: Category Breakdown Donut & Complaint Trend Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Donut Card */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Complaints by Category
                  </h3>
                  <p className="text-[11px] text-slate-400">Institutional resource distribution</p>
                </div>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  Overview
                </span>
              </div>

              <CategoryDonutChart data={data?.category_breakdown} height={230} />
            </div>

            {/* Monthly Trend Line Chart */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Resolution Trend & Volume (6-Month)
                  </h3>
                  <p className="text-[11px] text-slate-400">Monthly logged vs resolved tickets</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Positive SLA
                </span>
              </div>

              <VolumeTrendLineChart data={data?.volume_trends} height={230} />
            </div>
          </div>

          {/* Provider Workload & Rating Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Service Provider Performance & Workload
                </h3>
                <p className="text-[11px] text-slate-400">Contracted technician metrics and ratings</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Technician Name</th>
                    <th className="py-2.5 px-4">Primary Trade</th>
                    <th className="py-2.5 px-4">Active Jobs</th>
                    <th className="py-2.5 px-4">Completed</th>
                    <th className="py-2.5 px-4 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(!data?.provider_workloads || data.provider_workloads.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No technicians registered yet. Register providers via the Authority console.
                      </td>
                    </tr>
                  ) : (
                    data.provider_workloads.map((tech, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{tech.technician_name}</td>
                        <td className="py-3 px-4 text-slate-600">{tech.trade}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
                            {tech.active_jobs}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{tech.completed_jobs}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">★ {tech.rating} <span className="text-[10px] text-slate-400 font-normal">({tech.reviews_count || 0} reviews)</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Student Ratings & Worker Reviews Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Student Ratings & Worker Reviews
                </h3>
                <p className="text-[11px] text-slate-400">
                  Student evaluations & feedback for completed maintenance jobs
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-xl">
                <span className="text-xs font-black text-amber-700">
                  ★ {data?.avg_student_rating > 0 ? data.avg_student_rating.toFixed(1) : '5.0'} / 5.0
                </span>
                <span className="text-[11px] text-amber-600">
                  ({data?.total_reviews || 0} student reviews)
                </span>
              </div>
            </div>

            {(!data?.recent_reviews || data.recent_reviews.length === 0) ? (
              <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <p className="font-semibold text-slate-600">No student reviews submitted yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  When students track and complete maintenance issues, their feedback and ratings about technicians will display here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.recent_reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#0f6fb0] block">
                            {rev.complaint_id}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                            {rev.category} • {rev.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-[11px] font-black text-amber-900">{rev.rating}.0</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 italic leading-relaxed bg-white border border-slate-100 rounded-lg p-2.5 mb-2.5">
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px]">
                      <span className="font-bold text-slate-700">
                        Worker: {rev.technician_name}
                      </span>
                      <span className="text-slate-400">{rev.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Recent Complaints Read-Only Log */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recent Incident Audit Log (Read-Only)
              </h3>
              <p className="text-[11px] text-slate-400">Strictly administrative monitoring</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Ticket</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(!data?.recent_complaints || data.recent_complaints.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No complaints logged yet. This log will populate as students submit maintenance issues.
                      </td>
                    </tr>
                  ) : (
                    data.recent_complaints.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-brand-700">{c.complaint_id}</td>
                        <td className="py-3 px-4 font-medium">{c.category}</td>
                        <td className="py-3 px-4 text-slate-500">📍 {c.location}</td>
                        <td className="py-3 px-4 text-slate-400">{c.created_at}</td>
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
        </main>
      </div>
    </div>
  );
};
