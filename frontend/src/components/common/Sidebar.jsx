import React from 'react';
import { 
  LayoutDashboard, 
  ListChecks, 
  Users, 
  LogOut, 
  Wrench, 
  PieChart,
  FileText
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ role = 'authority', pendingCount = 0 }) => {
  const { user, logout } = useAuth();

  const effectiveRole = user?.role || role;

  const navItems = {
    authority: [
      { to: '/authority/overview', label: 'Facilities Overview', icon: LayoutDashboard },
      { to: '/authority/queue', label: 'Approval Queue', icon: ListChecks, badge: pendingCount > 0 ? pendingCount : null },
      { to: '/authority/technicians', label: 'Technicians Directory', icon: Users },
    ],
    provider: [
      { to: '/provider/dashboard', label: 'Assigned Maintenance Requests', icon: Wrench, badge: pendingCount > 0 ? pendingCount : null },
    ],
    principal: [
      { to: '/principal/analytics', label: 'Executive Analytics', icon: PieChart },
      { to: '/principal/reports', label: 'Reports', icon: FileText },
    ]
  };

  const currentNav = navItems[effectiveRole] || navItems.authority;

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-800 bg-[#0f172a] text-slate-300 p-4 min-h-[calc(100vh-4rem)]">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Role Badge in Sidebar */}
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold text-white tracking-wide uppercase">
              {effectiveRole === 'authority' ? 'Admin Console' : effectiveRole === 'provider' ? 'Provider Portal' : 'Principal Portal'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {effectiveRole === 'authority' ? 'Manual Review & Dispatch' : effectiveRole === 'provider' ? 'Request Execution & Updates' : 'Read-Only Institutional KPIs'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0f6fb0] text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-6 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/40 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
};
