import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Stethoscope, 
  MessageSquare, 
  Scan, 
  Calendar, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  FileText,
  Pill,
  Menu,
  X,
  Activity,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import MedoraLogo from './MedoraLogo';

interface LayoutProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  hideRefresh?: boolean;
  children: React.ReactNode;
}

export default function Layout({ user, activeTab, setActiveTab, onBack, onRefresh, hideRefresh, children }: LayoutProps) {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  let navItems: { id: string; label: string; icon: any; special?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'symptom', label: 'Symptom Checker', icon: Stethoscope },
    { id: 'chatbot', label: 'AI Chatbot', icon: MessageSquare },
    { id: 'skin', label: 'Skin Detection', icon: Scan },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'medicine', label: 'Medicine', icon: Pill },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  if (user.role === 'admin') {
    navItems = [
      { 
        id: 'admin', 
        label: 'Admin Panel', 
        icon: ShieldCheck,
        special: true 
      }
    ];
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#05070a]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {!hideRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MedoraLogo size="sm" />
            <span className="text-lg font-black tracking-tighter text-white uppercase">Medora</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 w-80 bg-[#05070a]/95 lg:bg-[#05070a]/80 backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 lg:z-20 overflow-hidden transition-transform duration-500 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#00d2ff]/5 to-transparent pointer-events-none" />
        
        <div className="p-8 relative hidden lg:block">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 shadow-lg shadow-black/20"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {!hideRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 shadow-lg shadow-black/20"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 group cursor-pointer">
            <MedoraLogo size="sm" className="w-14 h-14" />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-white uppercase leading-none">Medora</span>
              <span className="text-[8px] uppercase tracking-[0.15em] font-black text-[#00d2ff] mt-1">Advanced AI Health Companion</span>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Header */}
        <div className="lg:hidden p-8 relative">
          <div className="flex items-center gap-4">
            <MedoraLogo size="sm" />
            <span className="text-xl font-black text-white uppercase">Medora</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar relative">
          {navItems.map((item: any) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`group/nav relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 overflow-hidden ${
                  isActive 
                    ? 'text-white' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-gradient-to-r from-[#00d2ff]/10 to-transparent border-l-4 border-[#00d2ff]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className={`relative z-10 p-2 rounded-xl transition-all duration-500 ${
                  isActive 
                    ? 'bg-[#00d2ff]/20 text-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.2)]' 
                    : 'bg-white/5 text-white/40 group-hover/nav:bg-white/10 group-hover/nav:text-white'
                }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                
                <span className="relative z-10 font-bold text-sm tracking-wide">{item.label}</span>
                
                {isActive && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto relative border-t border-white/5">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#00d2ff]/5 to-transparent pointer-events-none" />
          <div className="glass-card p-5 flex items-center gap-4 relative z-10 group hover:bg-white/10 transition-colors cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00d2ff]/20 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <UserIcon className="w-5 h-5 text-white/40" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate">{user.name}</p>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-[#00d2ff] animate-pulse shadow-[0_0_8px_#00d2ff]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`} />
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group/logout border border-transparent hover:border-red-400/20"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar mt-16 lg:mt-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
