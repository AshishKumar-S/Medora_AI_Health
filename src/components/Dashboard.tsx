import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock,
  FileText,
  Pill,
  Trash2,
  Plus,
  ChevronRight
} from 'lucide-react';
import { UserProfile, Prediction, Appointment, MedicineTaken } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard({ user, setActiveTab }: { user: UserProfile; setActiveTab: (tab: string) => void }) {
  const { token } = useAuth();
  const [stats, setStats] = useState({ 
    patients: 0, 
    predictions: 0, 
    consultancy: 0, 
    skinPredictions: 0,
    avgConfidence: 0,
    healthScore: 85
  });
  const [recentPredictions, setRecentPredictions] = useState<Prediction[]>([]);
  const [userMedicines, setUserMedicines] = useState<MedicineTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading');

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch stats (Admin only)
      let statsData = { users: 0, visits: 0 };
      if (user.role === 'admin') {
        const statsRes = await fetch('/api/admin/stats', { headers });
        if (statsRes.ok) {
          statsData = await statsRes.json();
        }
      }
      
      // Fetch predictions
      const predsRes = await fetch('/api/predictions', { headers });
      const predsData = predsRes.ok ? await predsRes.json() : [];
      
      // Fetch medicines taken
      const medsRes = await fetch('/api/medicines-taken', { headers });
      const medsData = medsRes.ok ? await medsRes.json() : [];

      // Fetch appointments (to count consultancy)
      const aptsRes = await fetch('/api/appointments', { headers });
      const aptsData = aptsRes.ok ? await aptsRes.json() : [];

      const skinPreds = predsData.filter((d: any) => d.type === 'skin');
      const totalConfidence = predsData.reduce((acc: number, d: any) => acc + (d.confidence || 0), 0);
      const avgConf = predsData.length > 0 ? (totalConfidence / predsData.length) * 100 : 0;

      setStats({
        patients: statsData.users || 0,
        predictions: predsData.length,
        consultancy: aptsData.length + predsData.length,
        skinPredictions: skinPreds.length,
        avgConfidence: avgConf,
        healthScore: Math.min(100, 70 + (avgConf * 0.3))
      });

      setRecentPredictions(predsData.slice(0, 5));
      setUserMedicines(medsData.slice(0, 4));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setLoading(false);
    }
  }, [token, user.role]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      } catch (err) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveMedicine = async (id: string) => {
    try {
      await fetch(`/api/medicines-taken/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error("Failed to remove medicine:", err);
    }
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gradient glow-text text-center sm:text-left">Dashboard</h1>
          <p className="text-white/40 font-medium text-sm sm:text-base text-center sm:text-left">Welcome back, <span className="text-white/80">{user.name}</span></p>
          {user.previousLogin && (
            <p className="text-white/20 text-[10px] uppercase tracking-widest mt-1 text-center sm:text-left">
              Last Visit: {format(new Date(user.previousLogin), 'MMM d, yyyy • h:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-xl self-center sm:self-auto">
          <div className={`w-2 h-2 rounded-full animate-pulse ${backendStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">System {backendStatus}</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
        <StatCard icon={Users} label="Consultations" value={stats.consultancy} color="blue" />
        <StatCard icon={TrendingUp} label="Health Score" value={`${stats.healthScore.toFixed(0)}%`} color="cyan" />
        <StatCard icon={Activity} label="Skin Scans" value={stats.skinPredictions} color="blue" />
        <StatCard icon={Clock} label="Avg. Confidence" value={`${stats.avgConfidence.toFixed(1)}%`} color="indigo" />
        
        <button 
          onClick={() => setActiveTab('report')}
          className="glass-card p-4 lg:p-6 flex items-center gap-4 hover:bg-white/10 transition-all group text-left relative overflow-hidden col-span-2 md:col-span-1"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d2ff]/5 blur-2xl rounded-full -mr-12 -mt-12" />
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center bg-[#00d2ff]/20 text-[#00d2ff] group-hover:scale-110 transition-transform relative z-10">
            <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Reports</p>
            <p className="text-base lg:text-lg font-bold flex items-center gap-1 group-hover:text-[#00d2ff] transition-colors">
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </button>
      </div>

      {/* Medicines Taken Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00d2ff]/5 blur-[80px] rounded-full -mr-24 -mt-24" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00d2ff]/20 rounded-xl flex items-center justify-center">
                  <Pill className="w-5 h-5 text-[#00d2ff]" />
                </div>
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Medicines Taken</h2>
              </div>
              <button 
                onClick={() => setActiveTab('medicine')}
                className="group px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#00d2ff] hover:bg-[#00d2ff] hover:text-white border border-[#00d2ff]/20 transition-all flex items-center justify-center gap-2"
              >
                Manage <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              <AnimatePresence mode="popLayout">
                {userMedicines.map((med) => (
                  <motion.div
                    key={med.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center justify-between p-4 lg:p-5 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-[#00d2ff]/10 to-[#00d2ff]/20 rounded-xl flex items-center justify-center border border-[#00d2ff]/20 group-hover:scale-110 transition-transform">
                        <Pill className="w-5 h-5 lg:w-6 lg:h-6 text-[#00d2ff]" />
                      </div>
                      <div>
                        <p className="font-black text-white/80 text-sm lg:text-base">{med.medicineName}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold">Added {format(new Date(med.takenAt), 'MMM d, HH:mm')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMedicine(med.id)}
                      className="p-2 text-white/10 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {userMedicines.length === 0 && (
                <div className="col-span-full py-12 lg:py-16 text-center space-y-4 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                    <Pill className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-sm text-white/30 font-medium italic">No medicines recorded for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Predictions */}
          <div className="glass-card p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full -ml-24 -mb-24" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Recent Predictions</h2>
            </div>
            
            <div className="overflow-x-auto relative z-10 -mx-6 px-6 lg:mx-0 lg:px-0">
              <table className="w-full border-separate border-spacing-y-3 min-w-[500px]">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 px-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Condition</th>
                    <th className="pb-4 px-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Confidence</th>
                    <th className="pb-4 px-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPredictions.map((pred) => (
                    <tr key={pred.id} className="group hover:scale-[1.01] transition-transform">
                      <td className="py-4 lg:py-5 px-6 bg-white/5 rounded-l-2xl border-y border-l border-white/5 group-hover:bg-white/10 transition-colors">
                        <span className="font-black text-white/80 text-sm lg:text-base">{pred.result}</span>
                      </td>
                      <td className="py-4 lg:py-5 px-6 bg-white/5 border-y border-white/5 group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[60px]">
                            <div 
                              className="h-full bg-[#00d2ff] rounded-full shadow-[0_0_8px_#00d2ff]" 
                              style={{ width: `${pred.confidence * 100}%` }} 
                            />
                          </div>
                          <span className="text-xs text-[#00d2ff] font-black tracking-tighter">{(pred.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-4 lg:py-5 px-6 bg-white/5 rounded-r-2xl border-y border-r border-white/5 group-hover:bg-white/10 transition-colors">
                        <span className="text-xs font-bold text-white/30 tracking-widest whitespace-nowrap">
                          {pred.createdAt ? (
                            (() => {
                              try {
                                const d = typeof pred.createdAt === 'string' ? new Date(pred.createdAt) : (pred.createdAt as any).toDate ? (pred.createdAt as any).toDate() : new Date(pred.createdAt);
                                return format(d, 'MMM d, yyyy');
                              } catch (e) {
                                return 'N/A';
                              }
                            })()
                          ) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentPredictions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-white/20 italic font-medium">No recent predictions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Health Insights / Tips */}
        <div className="space-y-6">
          <div className="glass-card p-8 bg-gradient-to-br from-[#00d2ff]/20 via-transparent to-transparent border-[#00d2ff]/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d2ff]/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00d2ff] mb-4">Daily Health Tip</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Drinking enough water essential for health. Aim for at least 8 glasses a day to keep your body hydrated and functioning optimally.
              </p>
            </div>
          </div>
          
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#0072ff]/5 blur-3xl rounded-full -mr-16 -mb-16" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-6 relative z-10">Quick Actions</h3>
            <div className="space-y-3 relative z-10">
              {[
                { id: 'symptom', label: 'Check Symptoms', icon: Activity },
                { id: 'skin', label: 'Scan Skin', icon: Activity },
                { id: 'chatbot', label: 'Ask AI Assistant', icon: Activity }
              ].map((action) => (
                <button 
                  key={action.id}
                  onClick={() => setActiveTab(action.id as any)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-sm font-bold transition-all flex items-center justify-between group border border-white/5 hover:border-white/10"
                >
                  <span className="group-hover:text-[#00d2ff] transition-colors">{action.label}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white/20 group-hover:text-[#00d2ff]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: 'bg-[#00d2ff]/10 text-[#00d2ff] border-[#00d2ff]/20 shadow-[#00d2ff]/10',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/10',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-purple-500/10',
  };

  return (
    <div className="glass-card p-4 sm:p-6 flex items-center gap-3 sm:gap-4 group hover:scale-[1.02] active:scale-[0.98]">
      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rotate-[10deg] ${colors[color]}`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <div>
        <p className="text-[8px] sm:text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{label}</p>
        <p className="text-lg sm:text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
