import React from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // If accessed via QR code with location query params (?location=..., ?loc=...) or ?portal=student,
  // immediately redirect to the student complaint portal with location prefilled.
  const locationParam = searchParams.get('location') || searchParams.get('loc') || searchParams.get('place') || searchParams.get('zone');
  const studentParam = searchParams.get('portal') === 'student' || searchParams.get('student') || searchParams.get('qr');
  if (locationParam || studentParam) {
    return <Navigate to={`/student?${searchParams.toString()}`} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Hero Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">Smart Campus</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Campus Facility Maintenance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-400">
            Management System
          </span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Report facility issues instantly via QR or form, track maintenance progress in real time, or log in to manage campus operations.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/student"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105"
          >
            Start Complaint <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-6 py-3.5 text-sm font-bold text-slate-200 transition-all hover:scale-105"
          >
            Track Complaint
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-6 py-3.5 text-sm font-bold text-slate-200 transition-all hover:scale-105"
          >
            Staff Login
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Smart Campus — Facility Maintenance Management • Built for Enterprise Campus Infrastructure
      </footer>
    </div>
  );
};
