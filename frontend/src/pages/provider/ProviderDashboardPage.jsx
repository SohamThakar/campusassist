import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { assignmentsAPI } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const ProviderDashboardPage = () => {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Complete Request Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await assignmentsAPI.getMine();
      setAssignments(res.data);
    } catch (err) {
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const handleAccept = async (assignmentId) => {
    try {
      await assignmentsAPI.accept(assignmentId);
      setActionSuccess('Request accepted! Status updated to In Progress.');
      fetchAssignments();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to accept request.');
    }
  };

  const handleDecline = async (assignmentId) => {
    const reason = prompt('Please enter reason for declining this request:');
    if (reason === null) return;

    try {
      await assignmentsAPI.reject(assignmentId, { notes: reason });
      setActionSuccess('Request declined and released back to Authority Queue.');
      fetchAssignments();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to decline request.');
    }
  };

  const handleCompleteSubmit = async () => {
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      await assignmentsAPI.complete(selectedAssignment.id, {
        notes: resolutionNotes.trim() || 'Maintenance repair executed and verified.',
      });
      setCompleteModalOpen(false);
      setSelectedAssignment(null);
      setResolutionNotes('');
      setActionSuccess('Maintenance request marked as Completed!');
      fetchAssignments();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to complete request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by status
  const pendingRequests = assignments.filter((a) => a.status === 'pending');
  const inProgressRequests = assignments.filter((a) => a.status === 'in_progress' || a.status === 'accepted');
  const completedRequests = assignments.filter((a) => a.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Assigned Maintenance Requests" />

      <div className="flex-1 flex">
        <Sidebar role="provider" pendingCount={pendingRequests.length} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Assigned Maintenance Requests
                </h1>
                <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  {user?.name || 'Verified Technician'}
                </span>
              </div>
            </div>

            <button
              onClick={fetchAssignments}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {actionSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="ASSIGNED REQUESTS"
              value={pendingRequests.length}
              change={pendingRequests.length > 0 ? 'Pending your acceptance' : 'None pending'}
              changeType={pendingRequests.length > 0 ? 'negative' : 'neutral'}
              icon={Clock}
              highlight={pendingRequests.length > 0}
            />
            <StatCard
              title="IN PROGRESS"
              value={inProgressRequests.length}
              change={inProgressRequests.length > 0 ? 'Active on-site tasks' : 'None in progress'}
              changeType="neutral"
              icon={Wrench}
            />
            <StatCard
              title="COMPLETED"
              value={completedRequests.length}
              change={completedRequests.length > 0 ? 'Resolved requests' : 'No completions yet'}
              changeType={completedRequests.length > 0 ? 'positive' : 'neutral'}
              icon={CheckCircle2}
            />
          </div>

          {/* Section 1: Assigned (Pending Acceptance) */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Requests ({pendingRequests.length})</h2>
              <p className="text-xs text-slate-500">Newly assigned requests awaiting acceptance</p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Wrench className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">No pending assignments</p>
                  <p className="text-[11px] text-slate-400">Newly assigned requests dispatched to you will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((assign) => {
                  const comp = assign.complaint;

                  return (
                    <div
                      key={assign.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-all"
                    >
                      <div>
                        {/* Top ID & Category */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-brand-700">
                            {assign.complaint_id}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {comp?.category}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed mb-3">
                          {comp?.description}
                        </p>

                        {/* Location */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{comp?.location}</span>
                        </div>

                        {/* Photo Evidence if any */}
                        {comp?.photo_url && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 max-h-32">
                            <img src={comp.photo_url} alt="Evidence" className="w-full h-28 object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleAccept(assign.id)}
                          className="flex items-center justify-center gap-1 rounded-xl bg-[#0f6fb0] hover:bg-brand-700 text-white py-2 text-xs font-bold shadow-xs transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleDecline(assign.id)}
                          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 text-xs font-semibold transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: In Progress */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">In Progress ({inProgressRequests.length})</h2>
                <p className="text-xs text-slate-500">Active maintenance currently being resolved</p>
              </div>
            </div>

            {inProgressRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                No active requests currently in progress.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressRequests.map((assign) => (
                  <div
                    key={assign.id}
                    className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white p-5 shadow-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{assign.complaint_id}</span>
                        <StatusBadge status="in_progress" size="sm" />
                      </div>
                      <div className="mb-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {assign.complaint?.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mb-3">{assign.complaint?.description}</p>
                      <div className="text-[11px] text-slate-500 mb-4 bg-white/80 p-2 rounded-lg border border-amber-100">
                        📍 <strong>Location:</strong> {assign.complaint?.location}
                      </div>
                      {assign.complaint?.photo_url && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 max-h-32">
                          <img src={assign.complaint.photo_url} alt="Evidence" className="w-full h-28 object-cover" />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAssignment(assign);
                        setCompleteModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark as Completed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Completed */}
          {completedRequests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Completed Requests ({completedRequests.length})</h2>
                <p className="text-xs text-slate-500">Past resolved maintenance requests</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedRequests.map((assign) => (
                  <div
                    key={assign.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">{assign.complaint_id}</span>
                      <StatusBadge status="completed" size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 truncate mb-1">{assign.complaint?.description}</p>
                    <p className="text-[11px] text-slate-400">📍 {assign.complaint?.location}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Complete Request Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Maintenance Request ${selectedAssignment?.complaint_id}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Confirm completion for <strong>{selectedAssignment?.complaint?.category}</strong> at{' '}
            <strong>{selectedAssignment?.complaint?.location}</strong>.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Resolution Notes / Actions Taken
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe work done (e.g. Replaced leaking valve, tested electrical outlet, repaired door frame...)"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Completed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
