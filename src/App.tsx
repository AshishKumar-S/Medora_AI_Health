import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import SymptomChecker from './components/SymptomChecker';
import AIChatbot from './components/AIChatbot';
import SkinDetection from './components/SkinDetection';
import Appointments from './components/Appointments';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import MedicineList from './components/MedicineList';
import Report from './components/Report';
import MedoraLogo from './components/MedoraLogo';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, loading, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabHistory, setTabHistory] = useState<string[]>(['dashboard']);
  const [adminEntered, setAdminEntered] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user?.lastActiveTab && user.lastActiveTab !== activeTab) {
      setActiveTab(user.lastActiveTab);
      setTabHistory([user.lastActiveTab]);
    } else if (!user) {
      setActiveTab('dashboard');
      setTabHistory(['dashboard']);
      setAdminEntered(false);
    }
  }, [user?.uid]); // Only sync on user change (login/logout)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setTabHistory(prev => [...prev, tab]);
    
    // Persist to profile
    if (user) {
      updateProfile({ lastActiveTab: tab }).catch(e => console.error("Failed to save last active tab:", e));
    }
  };

  const handleBack = () => {
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // Remove current tab
      const previousTab = newHistory[newHistory.length - 1];
      setTabHistory(newHistory);
      setActiveTab(previousTab);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'dashboard') {
      setActiveTab('admin');
      setTabHistory(['admin']);
    } else if (user?.role === 'patient' && activeTab === 'admin') {
      setActiveTab('dashboard');
      setTabHistory(['dashboard']);
    }
  }, [user?.role, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-[#00d2ff] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (user.role === 'admin' && !adminEntered) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="atmosphere" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-8"
        >
          <MedoraLogo size="lg" className="mx-auto mb-6" />
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Medora ADMIN</h1>
            <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Advanced AI Health Companion</p>
          </div>
          <button 
            onClick={() => {
              setAdminEntered(true);
              handleTabChange('admin');
            }}
            className="group relative px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
          >
            <span className="relative z-10 flex items-center gap-3">
              Enter Admin Panel
              <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <div className="pt-12">
            <button 
              onClick={() => logout()}
              className="text-white/20 hover:text-white/60 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (user.role === 'admin' && adminEntered) {
    return (
      <div className="relative min-h-screen p-4 overflow-y-auto custom-scrollbar">
        <div className="atmosphere" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full"
        >
          <AdminPanel user={user} />
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard key={`dashboard-${refreshKey}`} user={user} setActiveTab={handleTabChange} />;
      case 'symptom': return <SymptomChecker key={`symptom-${refreshKey}`} user={user} />;
      case 'chatbot': return <AIChatbot key={`chatbot-${refreshKey}`} user={user} />;
      case 'skin': return <SkinDetection key={`skin-${refreshKey}`} user={user} />;
      case 'appointments': return <Appointments key={`appointments-${refreshKey}`} user={user} />;
      case 'medicine': return <MedicineList key={`medicine-${refreshKey}`} user={user} />;
      case 'report': return <Report key={`report-${refreshKey}`} user={user} />;
      case 'admin': return <AdminPanel key={`admin-${refreshKey}`} user={user} />;
      case 'profile': return <Profile key={`profile-${refreshKey}`} user={user} />;
      default: return <Dashboard key={`default-${refreshKey}`} user={user} setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className="relative min-h-screen">
      <Toaster position="top-center" richColors />
      <div className="atmosphere" />
      <Layout 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        onBack={handleBack}
        onRefresh={handleRefresh}
      >
        {renderContent()}
      </Layout>
    </div>
  );
}
