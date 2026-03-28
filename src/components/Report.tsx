import React, { useState, useEffect } from 'react';
import { Prediction, UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Scan, Calendar, TrendingUp, Info, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Report({ user }: { user: UserProfile }) {
  const { token } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'symptom' | 'skin'>('all');

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch('/api/predictions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setPredictions(data);
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPredictions();
    }
  }, [token]);

  const filteredPredictions = predictions.filter(p => filter === 'all' || p.type === filter);

  const stats = {
    total: predictions.length,
    symptom: predictions.filter(p => p.type === 'symptom').length,
    skin: predictions.filter(p => p.type === 'skin').length,
    avgConfidence: predictions.length > 0 
      ? (predictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / predictions.length) * 100 
      : 0
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Health Reports</h1>
        <p className="text-white/40">Detailed analysis of your symptom and skin detection results</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportStatCard icon={TrendingUp} label="Total Analysis" value={stats.total} color="cyan" />
        <ReportStatCard icon={Stethoscope} label="Symptom Checks" value={stats.symptom} color="blue" />
        <ReportStatCard icon={Scan} label="Skin Detections" value={stats.skin} color="green" />
        <ReportStatCard icon={TrendingUp} label="Avg. Confidence" value={`${stats.avgConfidence.toFixed(1)}%`} color="purple" />
      </div>

      {/* Main Content */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Detailed History</h2>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['all', 'symptom', 'skin'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-[#00d2ff] text-white shadow-lg shadow-[#00d2ff]/20' : 'text-white/40 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPredictions.map((pred) => (
              <motion.div
                key={pred.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="group relative p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      pred.type === 'symptom' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                    }`}>
                      {pred.type === 'symptom' ? <Stethoscope className="w-6 h-6" /> : <Scan className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${
                          pred.type === 'symptom' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                          {pred.type}
                        </span>
                        <span className="text-xs text-white/20 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {(() => {
                            try {
                              const d = typeof pred.createdAt === 'string' ? new Date(pred.createdAt) : (pred.createdAt as any).toDate ? (pred.createdAt as any).toDate() : new Date(pred.createdAt);
                              return format(d, 'MMM d, yyyy • HH:mm');
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#00d2ff] transition-colors">{pred.result}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pred.confidence * 100}%` }}
                            className={`h-full ${
                              pred.confidence > 0.8 ? 'bg-green-500' : pred.confidence > 0.5 ? 'bg-[#00d2ff]' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-black text-white">{(pred.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#00d2ff] transition-colors" />
                  </div>
                </div>

                {pred.symptoms && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Symptoms Analyzed</p>
                    <div className="flex flex-wrap gap-2">
                      {pred.symptoms.split(',').map((s, i) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-white/60">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPredictions.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-8 h-8 text-white/20" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white/60">No reports found</p>
                <p className="text-sm text-white/40">Try running a symptom check or skin detection first</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportStatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    cyan: 'bg-[#00d2ff]/20 text-[#00d2ff]',
    blue: 'bg-blue-500/20 text-blue-500',
    green: 'bg-green-500/20 text-green-500',
    purple: 'bg-purple-500/20 text-purple-500',
  };

  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
