import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Trash2,
  Wrench,
  Clock,
  Layers
} from 'lucide-react';
import { complaintsAPI, techniciansAPI, assignmentsAPI } from '../../api/endpoints';
import { getUploadUrl } from '../../api/client';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const MaintenanceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Delete Job Modal State
  const [isDeleteJobModalOpen, setIsDeleteJobModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  // Master Issue State
  const [masterIssueData, setMasterIssueData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, techRes] = await Promise.all([
        complaintsAPI.getById(id),
        techniciansAPI.list({ status_filter: 'verified' }),
      ]);
      setComplaint(compRes.data);
      setTechnicians(techRes.data);
      if (techRes.data.length > 0) {
        // If already assigned, preselect assigned tech
        const assignedTech = compRes.data.assignments?.[0]?.technician_id;
        setSelectedTechId(assignedTech || techRes.data[0].technician_id);
      }

      // If linked to a Master Issue, fetch full Master Issue grouping
      const miId = compRes.data.master_issue_id || compRes.data.master_issue?.issue_id;
      if (miId) {
        try {
          const miRes = await complaintsAPI.getMasterIssue(miId);
          setMasterIssueData(miRes.data);
        } catch (e) {
          console.warn('Could not load master issue details:', e);
        }
      } else {
        setMasterIssueData(null);
      }
    } catch (err) {
      console.error('Error fetching maintenance details:', err);
      setErrorMessage('Could not load complaint details.');
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAssign = async () => {
    if (!selectedTechId) {
      setErrorMessage('Please select a technician to assign.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await complaintsAPI.approve(id, {
        technician_id: selectedTechId,
        notes: notes.trim() || undefined,
      });
      setActionSuccess('Technician successfully assigned to maintenance request!');
      setTimeout(() => {
        navigate('/authority/queue');
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || 'Failed to assign technician.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejecting this request.');
      return;
    }
    setIsSubmitting(true);
    try {
      await complaintsAPI.reject(id, { reason: rejectReason.trim() });
      setIsRejectModalOpen(false);
      setActionSuccess('Request rejected.');
      setTimeout(() => {
        navigate('/authority/queue');
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to reject complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    setIsDeletingJob(true);
    setErrorMessage('');
    try {
      const res = await assignmentsAPI.delete(jobToDelete.id);
      setIsDeleteJobModalOpen(false);
      setJobToDelete(null);
      setActionSuccess(res.data?.message || `Job #${jobToDelete.id} deleted successfully. Complaint ${complaint.complaint_id} remains available.`);
      await fetchData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || 'Failed to delete job.');
    } finally {
      setIsDeletingJob(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <div className="h-4 w-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
          Loading maintenance details...
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 text-sm mb-4">Maintenance ticket not found.</p>
        <Link to="/authority/queue" className="text-xs font-bold text-brand-600">
          Return to Queue
        </Link>
      </div>
    );
  }

  const isRepeatedIssue = Boolean(
    masterIssueData && 
    masterIssueData.complaints && 
    masterIssueData.complaints.length > 1
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Maintenance Detail & Dispatch" />

      <div className="flex-1 flex">
        <Sidebar role="authority" />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {/* Breadcrumb & Title */}
          <div className="mb-6">
            <Link
              to="/authority/queue"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Queue
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Maintenance Request {complaint.complaint_id}
                </h1>
              </div>
              <StatusBadge status={complaint.status} size="md" />
            </div>
          </div>

          {actionSuccess && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Request Details & Evidence - 7 cols */}
            <div className="lg:col-span-7 space-y-6">
              {/* Left Card 1: Request Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Request Details
                </h2>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                    <span className="text-xs font-bold text-slate-800">{complaint.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                    <span className="text-xs font-bold text-slate-800">{complaint.location}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Submitted</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(complaint.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted By</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {complaint.submitted_by_contact || 'Student / Staff'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Detailed Description</span>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {complaint.description}
                  </div>
                </div>
              </div>

              {/* Master Issue Card (Only displayed for repeated complaints with > 1 report) */}
              {isRepeatedIssue && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#0f6fb0]" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Master Issue: <span className="text-[#0f6fb0] font-black tracking-normal">{masterIssueData.issue_id || complaint.master_issue_id}</span>
                      </h2>
                    </div>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0f6fb0]">
                      Reported {masterIssueData.complaints.length} times
                    </span>
                  </div>

                  {/* Problem & Details */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Problem</span>
                      <p className="text-sm font-bold text-slate-900">
                        {masterIssueData.title || complaint.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {masterIssueData.category || complaint.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {masterIssueData.location || complaint.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Reported</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {masterIssueData.complaints.length} complaints
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                        <span className="text-xs font-semibold capitalize text-slate-800">
                          {masterIssueData.status || complaint.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Complaints List */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                      Complaints:
                    </span>
                    <div className="space-y-2.5">
                      {masterIssueData.complaints.map((c) => (
                        <div
                          key={c.complaint_id}
                          className={`p-3.5 rounded-xl border transition-colors ${
                            c.complaint_id === complaint.complaint_id
                              ? 'bg-blue-50/70 border-blue-200'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/authority/queue/${encodeURIComponent(c.complaint_id)}`}
                              className="text-xs font-bold text-[#0f6fb0] hover:underline"
                            >
                              {c.complaint_id}
                              {c.complaint_id === complaint.complaint_id && (
                                <span className="ml-2 text-[10px] font-normal text-slate-500">(current)</span>
                              )}
                            </Link>
                            <span className="text-[11px] font-medium text-slate-500">
                              {new Date(c.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            Submitted by <span className="font-semibold text-slate-800">{c.submitted_by_contact || 'Student'}</span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-700 mt-1.5 italic">
                              "{c.description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Left Card 2: Photo Evidence */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Photo Evidence
                </h2>

                {complaint.photo_url ? (
                  <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-100 max-h-80">
                    <img
                      src={getUploadUrl(complaint.photo_url)}
                      alt="Complaint Photo Evidence"
                      className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-xs text-slate-400">
                    No photo uploaded with this request.
                  </div>
                )}
              </div>

              {/* Left Card 3: Video Evidence */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Video Evidence
                </h2>

                {complaint.video_url ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-black">
                    <video
                      controls
                      className="w-full max-h-80"
                      preload="metadata"
                    >
                      <source src={getUploadUrl(complaint.video_url)} />
                      Your browser does not support video playback.
                    </video>
                    <div className="bg-white px-4 py-2 flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 truncate">
                        🎬 {complaint.video_filename || 'Video Evidence'}
                      </span>
                      <a
                        href={getUploadUrl(complaint.video_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-[10px] font-semibold text-[#0f6fb0] hover:underline shrink-0"
                      >
                        Open in tab ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-xs text-slate-400">
                    No video uploaded with this request.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Jobs & Technician Assignment - 5 cols */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Existing Assigned Jobs Section */}
              {complaint.assignments && complaint.assignments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#0f6fb0]" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Assigned Jobs ({complaint.assignments.length})
                      </h2>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Active Work Orders</span>
                  </div>

                  <div className="space-y-3">
                    {complaint.assignments.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-slate-300 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#0f6fb0]">Job #JOB-{job.id}</span>
                          <StatusBadge status={job.status} size="sm" />
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                          <p>
                            <strong className="text-slate-700">Complaint:</strong> {complaint.complaint_id}
                          </p>
                          <p>
                            <strong className="text-slate-700">Location:</strong> {complaint.location}
                          </p>
                          <p>
                            <strong className="text-slate-700">Assigned Tech:</strong>{' '}
                            {job.technician?.user?.name || job.technician?.business_name || `Tech ID: ${job.technician_id}`}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <Clock className="h-3 w-3" /> Assigned: {new Date(job.assigned_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>

                        {/* Actions: Delete Job Button */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Admin Action</span>
                          <button
                            type="button"
                            onClick={() => {
                              setJobToDelete(job);
                              setIsDeleteJobModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Technician Assignment Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserCheck className="h-4 w-4 text-brand-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {complaint.assignments?.length > 0 ? 'Reassign / Dispatch Job' : 'Manual Technician Assignment'}
                  </h2>
                </div>

                {/* Technician Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Technician
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select Technician ▼</option>
                    {technicians.map((t) => (
                      <option key={t.technician_id} value={t.technician_id}>
                        {t.user_name || t.business_name} ({t.skills?.join(', ') || 'General'}) — Queue: {t.current_workload ?? 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dispatch Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Dispatch Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add instructions, access notes, or campus facility codes..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Primary Button: Assign Technician */}
                <button
                  onClick={handleAssign}
                  disabled={isSubmitting || complaint.status === 'completed'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f6fb0] hover:bg-brand-700 text-white py-3 text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? 'Dispatching...' : complaint.assignments?.length > 0 ? 'Reassign Job' : 'Assign Technician'}</span>
                </button>

                {/* Secondary Button: Reject */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2.5 text-xs font-semibold text-rose-700 transition-colors"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Job Confirmation Modal */}
      <Modal
        isOpen={isDeleteJobModalOpen}
        onClose={() => setIsDeleteJobModalOpen(false)}
        title="Delete Job?"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Are you sure you want to delete <strong>Job #JOB-{jobToDelete?.id}</strong>?
          </p>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-slate-600 space-y-1.5">
            <p><strong className="text-slate-800">Complaint:</strong> {complaint.complaint_id}</p>
            <p><strong className="text-slate-800">Location:</strong> {complaint.location}</p>
            <p><strong className="text-slate-800">Assigned Technician:</strong> {jobToDelete?.technician?.user?.name || jobToDelete?.technician?.business_name || jobToDelete?.technician_id}</p>
            <p><strong className="text-slate-800">Status:</strong> <span className="uppercase font-bold text-slate-800">{jobToDelete?.status}</span></p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              Important Relationship Notice
            </p>
            <p className="text-[11px] mt-1 text-amber-700 leading-relaxed">
              This will delete the job record but will <strong>NOT delete the associated complaint ({complaint.complaint_id})</strong>. The complaint and its tracking history will remain fully intact.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsDeleteJobModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteJob}
              disabled={isDeletingJob}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {isDeletingJob ? 'Deleting Job...' : 'Delete Job'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Maintenance Request"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please provide a specific reason for rejecting request <strong>{complaint.complaint_id}</strong>.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Duplicate report, insufficient details, or out of scope..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-rose-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

