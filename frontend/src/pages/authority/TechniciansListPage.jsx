import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Wrench, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Mail,
  MapPin,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { techniciansAPI, assignmentsAPI } from '../../api/endpoints';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar } from '../../components/common/Sidebar';
import { Modal } from '../../components/common/Modal';

export const TechniciansListPage = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Register Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [businessName, setBusinessName] = useState('');
  const [skills, setSkills] = useState('Plumbing, Drainage');
  const [serviceArea, setServiceArea] = useState('Main Campus & Labs');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTechs = async () => {
    setLoading(true);
    try {
      const res = await techniciansAPI.list();
      setTechnicians(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  const handleDeleteTechnician = async (tech) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete technician "${tech.user_name || tech.technician_id}"?\n\nThis will also delete all their job assignments. This action CANNOT be undone.`
    );
    if (!confirmed) return;
    setDeletingId(tech.technician_id);
    try {
      await techniciansAPI.delete(tech.technician_id);
      setTechnicians(prev => prev.filter(t => t.technician_id !== tech.technician_id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete technician');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllJobs = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to DELETE ALL JOBS?\n\nAll assignment records will be permanently removed. Complaints will be preserved and reset to Submitted status.\n\nThis action CANNOT be undone.'
    );
    if (!confirmed) return;
    setIsDeletingAll(true);
    try {
      const res = await assignmentsAPI.deleteAll();
      alert(res.data.message || 'All jobs deleted successfully.');
      fetchTechs(); // refresh workload counts
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete all jobs');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
      await techniciansAPI.register({
        name,
        email,
        password,
        business_name: businessName || undefined,
        skills: skillList,
        service_area: serviceArea,
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      fetchTechs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = technicians.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || (
      (t.user_name && t.user_name.toLowerCase().includes(q)) ||
      (t.business_name && t.business_name.toLowerCase().includes(q)) ||
      t.skills.some(s => s.toLowerCase().includes(q))
    );
    const matchesSkill = !selectedSkill || t.skills.some(s => s.toLowerCase() === selectedSkill.toLowerCase());
    return matchesSearch && matchesSkill;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Verified Service Providers" onSearch={setSearch} />

      <div className="flex-1 flex">
        <Sidebar role="authority" />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Technician Directory
                </h1>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  {technicians.length} Verified Providers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteAllJobs}
                disabled={isDeletingAll}
                title="Delete ALL job assignments (complaints are preserved)"
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 shadow-sm transition-all disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingAll ? 'Deleting...' : 'Delete All Jobs'}
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fb0] px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" /> Add Technician
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none"
            >
              <option value="">All Skills & Trades</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="Structural">Structural</option>
              <option value="Civil">Civil</option>
              <option value="Cleaning">Cleaning</option>
            </select>

            <button
              onClick={fetchTechs}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tech) => (
              <div
                key={tech.technician_id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-black text-base">
                        {(tech.user_name || tech.business_name || 'T').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {tech.user_name || 'Technician'}
                        </h3>
                        <p className="text-xs font-medium text-brand-700">
                          {tech.business_name || 'Campus Maintenance Team'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                      <span>{tech.rating}</span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tech.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Details strip */}
                  <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{tech.service_area}</span>
                    </div>
                    {tech.user_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{tech.user_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Active Queue: <strong className="text-slate-900">{tech.current_workload} jobs</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                    <button
                      onClick={() => handleDeleteTechnician(tech)}
                      disabled={deletingId === tech.technician_id}
                      title="Permanently delete this technician"
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deletingId === tech.technician_id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Add Technician Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Verified Technician"
      >
        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name*</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address*</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@service.com"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Business / Trade Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Precision HVAC Specialists"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Skills (comma-separated)*</label>
            <input
              type="text"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="HVAC, Electrical, Refrigeration"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Service Area</label>
            <input
              type="text"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="All Campus Zones"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#0f6fb0] text-white font-semibold hover:bg-brand-700"
            >
              {isSubmitting ? 'Registering...' : 'Register Provider'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
