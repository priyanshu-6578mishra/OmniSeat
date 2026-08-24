import React from 'react';
import {
  Ticket,
  ShieldCheck,
  Building2,
  ScanLine,
  Zap,
  BookOpen,
  ShoppingBag,
  Bell,
  Activity,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../lib/mockData';

interface NavbarProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  activeTab: 'explore' | 'bookings' | 'organiser' | 'admin' | 'scanner' | 'docs' | 'lab';
  setActiveTab: (tab: 'explore' | 'bookings' | 'organiser' | 'admin' | 'scanner' | 'docs' | 'lab') => void;
  activeHeldSeatsCount: number;
  onOpenHeldCart: () => void;
  onOpenStressLab: () => void;
  unreadOffersCount: number;
  onOpenOffers: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  activeTab,
  setActiveTab,
  activeHeldSeatsCount,
  onOpenHeldCart,
  onOpenStressLab,
  unreadOffersCount,
  onOpenOffers,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-900/60 text-purple-300 border border-purple-700/50 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span>;
      case 'ORGANISER':
        return <span className="bg-amber-900/60 text-amber-300 border border-amber-700/50 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Building2 className="w-3 h-3" /> Organiser</span>;
      case 'DOOR_STAFF':
        return <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><ScanLine className="w-3 h-3" /> Door Staff</span>;
      default:
        return <span className="bg-blue-900/60 text-blue-300 border border-blue-700/50 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Ticket className="w-3 h-3" /> Customer</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('explore')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                    OmniSeat
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                    Engine v2.4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono hidden sm:block">Zero Double-Booking Engine</p>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'explore'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Events & Tickets
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              My Ticket Wallet
            </button>

            {currentUser.role === 'ORGANISER' || currentUser.role === 'ADMIN' ? (
              <button
                onClick={() => setActiveTab('organiser')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'organiser'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Organiser Hub
              </button>
            ) : null}

            {currentUser.role === 'ADMIN' ? (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Studio
              </button>
            ) : null}

            {currentUser.role === 'DOOR_STAFF' || currentUser.role === 'ADMIN' ? (
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'scanner'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                Door Scanner
              </button>
            ) : null}

            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'docs'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Specs & System Design
            </button>
          </nav>

          {/* Action Bar (Stress Lab, Held Cart, Notifications, User Selector) */}
          <div className="flex items-center gap-2.5">
            {/* Stress Test Lab Button */}
            <button
              onClick={onOpenStressLab}
              title="Open Concurrency & Race-Condition Simulation Lab"
              className="relative px-3 py-1.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm group"
            >
              <Zap className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span className="hidden sm:inline">Stress Test Lab</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </button>

            {/* Waitlist Offers Bell */}
            {unreadOffersCount > 0 && (
              <button
                onClick={onOpenOffers}
                className="relative p-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl hover:bg-amber-500/20 transition-colors"
                title="You have time-limited waitlist offers waiting!"
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center">
                  {unreadOffersCount}
                </span>
              </button>
            )}

            {/* Held Cart (10m TTL Badge) */}
            {activeHeldSeatsCount > 0 && (
              <button
                onClick={onOpenHeldCart}
                className="relative px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-all animate-pulse"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Held ({activeHeldSeatsCount})</span>
              </button>
            )}

            {/* Role / User Selector Dropdown */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="relative group">
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const user = MOCK_USERS.find((u) => u.id === e.target.value);
                    if (user) {
                      onSelectUser(user);
                      if (user.role === 'ORGANISER') setActiveTab('organiser');
                      else if (user.role === 'ADMIN') setActiveTab('admin');
                      else if (user.role === 'DOOR_STAFF') setActiveTab('scanner');
                      else setActiveTab('explore');
                    }
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  {MOCK_USERS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>

              <div className="hidden lg:block">{getRoleBadge(currentUser.role)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950 px-2 py-2 text-xs">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-3 py-1 rounded-md ${activeTab === 'explore' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-3 py-1 rounded-md ${activeTab === 'bookings' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Wallet
        </button>
        {currentUser.role === 'ORGANISER' && (
          <button
            onClick={() => setActiveTab('organiser')}
            className={`px-3 py-1 rounded-md ${activeTab === 'organiser' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            Organiser
          </button>
        )}
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1 rounded-md ${activeTab === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            Admin
          </button>
        )}
        {currentUser.role === 'DOOR_STAFF' && (
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1 rounded-md ${activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            Scanner
          </button>
        )}
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-3 py-1 rounded-md ${activeTab === 'docs' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
        >
          Docs
        </button>
      </div>
    </header>
  );
};
