import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  ChevronRight, 
  ClipboardList,
  Layers,
  Trash2,
  QrCode
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { complaintsAPI, analyticsAPI } from '../../api/endpoints';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRCodeGeneratorModal } from '../../components/common/QRCodeGeneratorModal';

export const ApprovalQueuePage = () => {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteFilter, setDeleteFilter] = useState('pending');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrLocation, setSelectedQrLocation] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, statsRes] = await Promise.all([
        complaintsAPI.list({ category: filterCategory || undefined }),
        analyticsAPI.getAuthorityStats(),
      ]);
      setComplaints(compRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const labelMap = {
      pending: 'all PENDING (submitted + approved)',
      submitted: 'all SUBMITTED',
      approved: 'all APPROVED',
      rejected: 'all REJECTED',
      completed: 'all COMPLETED',
      all: 'ALL maintenance requests'
    };
    const label = labelMap[deleteFilter] || deleteFilter;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${label} requests?\n\nThis will delete the complaints and all linked data (assignments, history, AI analysis).\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;
    setIsDeletingAll(true);
    try {
      const res = await complaintsAPI.deleteAll(deleteFilter);
      alert(res.data.message || `Deleted ${res.data.deleted_count} request(s).`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete requests.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCategory]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.complaint_id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  const pendingCount = complaints.filter((c) => c.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Approval Queue — Maintenance Review" onSearch={setSearchQuery} />

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar role="authority" pendingCount={pendingCount} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Approval Queue
                </h1>
                <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  {pendingCount} Pending Assignment
                </span>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Categories</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Civil / Structural">Civil / Structural</option>
                <option value="Cleaning">Cleaning</option>
                <option value="IT / Network">IT / Network</option>
                <option value="Other">Other</option>
              </select>

              <button
                onClick={fetchData}
                title="Refresh Queue"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Bulk Delete Section */}
              <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                <select
                  value={deleteFilter}
                  onChange={(e) => setDeleteFilter(e.target.value)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 focus:outline-none"
                >
                  <option value="pending">Pending (Submitted + Approved)</option>
                  <option value="submitted">Submitted only</option>
                  <option value="approved">Approved only</option>
                  <option value="rejected">Rejected only</option>
                  <option value="completed">Completed only</option>
                  <option value="all">ALL Requests</option>
                </select>
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  title="Permanently delete selected requests"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-sm transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingAll ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="NEW REQUESTS"
              value={stats?.new_complaints ?? 0}
              change={stats?.new_complaints_today > 0 ? `+${stats.new_complaints_today} today` : 'None today'}
              changeType={stats?.new_complaints_today > 0 ? 'positive' : 'neutral'}
              highlight={true}
            />
            <StatCard
              title="IN PROGRESS"
              value={stats?.in_progress ?? 0}
              change={stats?.in_progress > 0 ? 'Active work ongoing' : 'Queue clear'}
              changeType="neutral"
            />
            <StatCard
              title="COMPLETED"
              value={stats?.completed ?? 0}
              change={stats?.completed > 0 ? 'Total requests completed' : 'No completions yet'}
              changeType={stats?.completed > 0 ? 'positive' : 'neutral'}
            />
          </div>

          {/* Full Width Table Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Maintenance Requests Pending Review
              </span>
              <span className="text-xs text-slate-400">
                Showing {filteredComplaints.length} requests
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Description & Location</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <ClipboardList className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-xs font-semibold text-slate-500">No requests in queue</p>
                          <p className="text-[11px] text-slate-400">Submitted requests will appear here for review and technician assignment.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((item) => (
                      <tr
                        key={item.complaint_id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/authority/queue/${encodeURIComponent(item.complaint_id)}`)}
                      >
                        {/* ID & Repeated Issue Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            <span className="text-brand-700 group-hover:underline">
                              {item.complaint_id}
                            </span>
                          </div>
                          {(item.master_issue_id || item.master_issue?.issue_id) && (item.master_issue?.complaints_count > 1 || item.duplicate_status === 'confirmed_duplicate') && (
                            <div className="mt-1 flex items-center gap-1">
                              <span 
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-[#0f6fb0]" 
                                title={`Master Issue: ${item.master_issue_id || item.master_issue?.issue_id}`}
                              >
                                <Layers className="h-2.5 w-2.5 shrink-0" />
                                {item.master_issue_id || item.master_issue?.issue_id}
                                {item.master_issue?.complaints_count > 1 && (
                                  <span className="text-slate-500 font-normal">({item.master_issue.complaints_count} reports)</span>
                                )}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Description & Location */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 truncate">
                            {item.description}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                            <span>📍 {item.location}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQrLocation(item.location);
                                setIsQrModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-sky-50 hover:bg-sky-100 text-[#0f6fb0] border border-sky-200/80 px-1.5 py-0.5 text-[10px] font-bold transition-all ml-1 shrink-0"
                              title={`Generate QR Code for ${item.location}`}
                            >
                              <QrCode className="h-3 w-3" /> QR
                            </button>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {item.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Review & Assign Action Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/authority/queue/${encodeURIComponent(item.complaint_id)}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0f6fb0] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                          >
                            Assign <ChevronRight className="h-3 w-3" />
                          </Link>
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

      <QRCodeGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => {
          setIsQrModalOpen(false);
          setSelectedQrLocation('');
        }}
        initialLocation={selectedQrLocation}
        availableLocations={Array.from(new Set(complaints.map((c) => c.location).filter(Boolean)))}
      />
    </div>
  );
};
