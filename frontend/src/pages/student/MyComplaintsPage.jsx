import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  FileText,
  Activity,
  Search,
  LogIn,
  Send,
  Wrench
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { complaintsAPI } from '../../api/endpoints';
import { StatusBadge } from '../../components/common/StatusBadge';

const formatTimestamp = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * ComplaintTimelineCard Component
 * Displays live progress, details, and milestone history for the tracked complaint.
 * NOTE: Attached Evidence (photo/video) is omitted from student view per requirements.
 */
const ComplaintTimelineCard = ({ complaint, onTrackAnother }) => {
  if (!complaint) return null;

  const rawStatus = typeof complaint.status === 'string' ? complaint.status : complaint.status?.value || 'submitted';
  const statusLower = rawStatus.toLowerCase();
  const isRejected = statusLower === 'rejected';

  // Parse history to match milestone dates
  const historyList = complaint.history || [];
  const sortedHistory = [...historyList].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const findHistory = (keywords) => {
    return sortedHistory.find((h) =>
      keywords.some((k) => (h.status || '').toLowerCase().includes(k))
    );
  };

  const submittedH = findHistory(['submit']);
  const approvedH = findHistory(['approve', 'review']);
  const assignedH = findHistory(['assign']);
  const inProgressH = findHistory(['progress', 'accept']);
  const completedH = findHistory(['complete', 'resolve']);
  const rejectedH = findHistory(['reject', 'decline']);

  const submittedTime = submittedH?.timestamp || complaint.created_at;
  const approvedTime = approvedH?.timestamp || (['approved', 'assigned', 'in_progress', 'completed'].includes(statusLower) ? complaint.updated_at : null);
  const assignedTime = assignedH?.timestamp || (['assigned', 'in_progress', 'completed'].includes(statusLower) ? complaint.updated_at : null);
  const inProgressTime = inProgressH?.timestamp || (['in_progress', 'completed'].includes(statusLower) ? complaint.updated_at : null);
  const completedTime = completedH?.timestamp || (statusLower === 'completed' ? complaint.updated_at : null);

  // Determine stage levels (0 to 4)
  let currentStep = 0;
  if (statusLower === 'submitted') currentStep = 0;
  else if (statusLower === 'approved') currentStep = 1;
  else if (statusLower === 'assigned') currentStep = 2;
  else if (statusLower === 'in_progress') currentStep = 3;
  else if (statusLower === 'completed') currentStep = 4;

  const timelineSteps = [
    {
      id: 'submitted',
      label: 'Complaint Submitted',
      date: submittedTime,
      done: true,
      active: currentStep === 0 && !isRejected,
      notes: submittedH?.notes || 'Complaint logged into system.',
    },
    {
      id: 'approved',
      label: 'Under Review / Approved',
      date: approvedTime,
      done: currentStep >= 1 && !isRejected,
      active: currentStep === 1 && !isRejected,
      notes: approvedH?.notes || (currentStep >= 1 ? 'Reviewed by facility administration.' : null),
    },
    {
      id: 'assigned',
      label: 'Technician Assigned',
      date: assignedTime,
      done: currentStep >= 2 && !isRejected,
      active: currentStep === 2 && !isRejected,
      notes: assignedH?.notes || (currentStep >= 2 ? 'Dispatched to maintenance technician.' : null),
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      date: inProgressTime,
      done: currentStep >= 3 && !isRejected,
      active: currentStep === 3 && !isRejected,
      notes: inProgressH?.notes || (currentStep >= 3 ? 'Technician resolving issue on site.' : null),
    },
    {
      id: 'completed',
      label: 'Resolved',
      date: completedTime,
      done: currentStep === 4 && !isRejected,
      active: currentStep === 4 && !isRejected,
      notes: completedH?.notes || (currentStep === 4 ? 'Issue verified and resolved.' : null),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Tracked Header Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Reference Code
            </span>
            <span className="text-base font-black text-[#0f6fb0]">
              {complaint.complaint_id}
            </span>
          </div>
          <StatusBadge status={rawStatus} size="sm" />
        </div>

        {/* Location & Problem Summary */}
        <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" /> Location
            </span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{complaint.location}</p>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" /> Problem
            </span>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{complaint.description}</p>
          </div>
        </div>

        {/* Priority, Submitted, Updated */}
        <div className="mt-3 grid grid-cols-3 gap-2 bg-white rounded-xl border border-slate-100 p-2.5 text-center">
          <div>
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Category</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">{complaint.category}</span>
          </div>
          <div className="border-x border-slate-100">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Submitted</span>
            <span className="text-[11px] font-semibold text-slate-700 mt-0.5 block">{formatDateShort(complaint.created_at)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Last Updated</span>
            <span className="text-[11px] font-semibold text-slate-700 mt-0.5 block">{formatDateShort(complaint.updated_at || complaint.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Rejection Notice (if rejected) */}
      {isRejected && (
        <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3.5">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-900">Complaint Rejected</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              {rejectedH?.notes || 'This maintenance request was rejected by campus administration.'}
            </p>
            {rejectedH?.timestamp && (
              <span className="text-[10px] text-rose-500 mt-1 block">
                {formatTimestamp(rejectedH.timestamp)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Complaint Status Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#0f6fb0]" /> Live Status Timeline
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Real-Time</span>
        </div>

        <div className="relative pl-6 space-y-4">
          {/* Connecting line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

          {timelineSteps.map((step) => {
            const isPassed = step.done;
            const isActive = step.active;

            return (
              <div key={step.id} className="relative flex items-start gap-3 group">
                {/* Node indicator */}
                <div
                  className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                    isPassed
                      ? 'bg-[#0f6fb0] border-[#0f6fb0] text-white shadow-xs'
                      : isActive
                      ? 'bg-white border-[#0f6fb0] text-[#0f6fb0] ring-4 ring-sky-100 animate-pulse'
                      : 'bg-white border-slate-300 text-slate-300'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                  ) : isActive ? (
                    <div className="h-2 w-2 rounded-full bg-[#0f6fb0]" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                  )}
                </div>

                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isPassed || isActive ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span
                      className={`text-[10px] font-semibold shrink-0 ${
                        isPassed && step.date
                          ? 'text-slate-600'
                          : isActive
                          ? 'text-[#0f6fb0] font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {isPassed && step.date
                        ? formatTimestamp(step.date)
                        : isActive
                        ? 'In Progress'
                        : 'Pending'}
                    </span>
                  </div>
                  {step.notes && isPassed && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      {step.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Action to track another complaint */}
      <button
        onClick={onTrackAnother}
        className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
      >
        Track Another Request
      </button>
    </div>
  );
};

export const MyComplaintsPage = () => {
  const location = useLocation();
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Clear any legacy localStorage recent complaints on mount
  useEffect(() => {
    try {
      localStorage.removeItem('recent_complaints');
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleTrackById = async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    const cleanId = targetId.trim();
    setSearchLoading(true);
    setSearchError('');

    try {
      const res = await complaintsAPI.getById(cleanId);
      if (res.data) {
        setTrackedComplaint(res.data);
      }
    } catch (err) {
      console.error(err);
      setSearchError(`No complaint found with Reference ID "${cleanId}". Please verify your ticket code (e.g. #REQ-4876).`);
      setTrackedComplaint(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-track if ID passed in URL params or router state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = location.state?.openComplaintId || params.get('track') || params.get('id') || params.get('code');
    if (targetId) {
      setSearchInput(targetId);
      handleTrackById(targetId);
    }
  }, [location.state, location.search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center sm:py-6">
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-xl sm:border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <Link
            to="/student"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-base font-bold text-slate-900">Complaint Tracking</h1>
            <span className="text-[10px] text-slate-400 font-medium">Track by Reference ID</span>
          </div>
          <button
            onClick={() => {
              if (searchInput.trim()) {
                handleTrackById(searchInput);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Refresh Tracking"
          >
            <RefreshCw className={`h-4 w-4 ${searchLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">

          {/* Search by Reference ID Input Card */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-xs">
            <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Enter Complaint Reference ID
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackById(searchInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="e.g. #REQ-4876 or #T-1234"
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0f6fb0] focus:outline-none focus:ring-1 focus:ring-[#0f6fb0]"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !searchInput.trim()}
                className="rounded-lg bg-[#0f6fb0] hover:bg-[#0c598d] px-3.5 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shrink-0"
              >
                {searchLoading ? 'Tracking...' : 'Track'}
              </button>
            </form>

            {searchError && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Body Content */}
          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-[#0f6fb0] border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">Retrieving complaint status...</p>
            </div>
          ) : trackedComplaint ? (
            /* Render Tracked Complaint Timeline */
            <ComplaintTimelineCard
              complaint={trackedComplaint}
              onTrackAnother={() => {
                setTrackedComplaint(null);
                setSearchInput('');
                setSearchError('');
              }}
            />
          ) : (
            /* Initial Clean Instruction View - No Available Complaints List */
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <ClipboardList className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Track Your Maintenance Request</p>
              <p className="text-xs text-slate-400 max-w-[240px]">
                Enter the Reference Code you received after submitting a complaint (e.g. #REQ-4876) to view real-time progress.
              </p>
              <Link
                to="/student"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fb0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0c598d] transition-all"
              >
                <Send className="h-3.5 w-3.5" /> Start a Complaint
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="flex items-center justify-around border-t border-slate-200 bg-white py-2.5 px-4 shrink-0">
          <Link
            to="/student"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="text-[11px]">Start Complaint</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-[#0f6fb0] font-semibold">
            <ClipboardList className="h-4 w-4" />
            <span className="text-[11px]">Track Complaint</span>
          </button>
          <Link
            to="/login"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span className="text-[11px]">Staff Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
