import React, { useState, useEffect } from 'react';
import { Medicine, MedicineTaken, UserProfile } from '../types';
import { Plus, Trash2, Pill, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function MedicineList({ user }: { user: UserProfile }) {
  const { token } = useAuth();
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [userMedicines, setUserMedicines] = useState<MedicineTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMedicines = async () => {
    try {
      const res = await fetch('/api/medicines', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailableMedicines(data);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    }
  };

  const fetchUserMedicines = async () => {
    try {
      const res = await fetch('/api/medicines-taken', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUserMedicines(data);
    } catch (err) {
      console.error("Failed to fetch user medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMedicines();
      fetchUserMedicines();
    }
  }, [token]);

  const handleAddMedicine = async (medicine: Medicine) => {
    try {
      await fetch('/api/medicines-taken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: 'As prescribed'
        })
      });
      fetchUserMedicines();
    } catch (err) {
      console.error("Failed to add medicine:", err);
    }
  };

  const handleRemoveMedicine = async (id: string) => {
    try {
      await fetch(`/api/medicines-taken/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUserMedicines();
    } catch (err) {
      console.error("Failed to remove medicine:", err);
    }
  };

  const filteredMedicines = availableMedicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Medicine Center</h1>
        <p className="text-xs lg:text-sm text-white/40">Manage your medications and explore available options</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Medicines */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg lg:text-xl font-semibold">Available Medicines</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredMedicines.map((medicine) => (
                  <motion.div
                    key={medicine.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00d2ff]/20 rounded-xl flex items-center justify-center">
                          <Pill className="w-5 h-5 text-[#00d2ff]" />
                        </div>
                        <div>
                          <h3 className="font-bold">{medicine.name}</h3>
                          <p className="text-xs text-[#00d2ff] font-medium uppercase tracking-wider">{medicine.category}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMedicine(medicine)}
                        className="p-2 bg-[#00d2ff] text-white rounded-lg hover:bg-[#00d2ff]/80 transition-all shadow-lg shadow-[#00d2ff]/20"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-white/60 line-clamp-2">{medicine.description}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* My Medications */}
        <div className="space-y-4">
          <div className="glass-card p-4 sm:p-6 h-full">
            <h2 className="text-lg lg:text-xl font-semibold mb-6">My Medications</h2>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {userMedicines.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Pill className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.medicineName}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Added {new Date(m.takenAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMedicine(m.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {userMedicines.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Info className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40 italic">No medications added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
