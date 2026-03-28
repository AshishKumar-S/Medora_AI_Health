import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Droplets, Calendar, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile({ user }: { user: UserProfile }) {
  const { updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countryCode, setCountryCode] = useState(() => {
    const mobile = user.mobile || '';
    const codes = ['+91', '+92', '+1', '+44', '+880', '+977', '+94'];
    for (const code of codes) {
      if (mobile.startsWith(code)) return code;
    }
    return '+91';
  });
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    age: user.age || '',
    sex: user.sex || 'Male',
    mobile: (() => {
      const mobile = user.mobile || '';
      const codes = ['+91', '+92', '+1', '+44', '+880', '+977', '+94'];
      for (const code of codes) {
        if (mobile.startsWith(code)) return mobile.slice(code.length);
      }
      return mobile;
    })(),
    bloodGroup: user.bloodGroup || '',
    address: user.address || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.mobile.length !== 10) {
      toast.error('Invalid Mobile Number', {
        description: 'Mobile number must be exactly 10 digits'
      });
      return;
    }
    setLoading(true);
    try {
      const updatedData = {
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
        mobile: `${countryCode}${formData.mobile}`,
      };
      
      await updateProfile(updatedData);
      
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tighter text-gradient glow-text">Your Profile</h1>
          <p className="text-xs sm:text-sm text-white/40 font-medium">Manage your personal information and health records</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Profile Status: Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-4 space-y-6 lg:space-y-8">
            <div className="glass-card p-6 sm:p-10 flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#00d2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="absolute inset-0 bg-[#00d2ff]/20 blur-2xl rounded-full animate-pulse" />
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-[#00d2ff] to-[#00d2ff]/80 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#00d2ff]/40 relative z-10 border-2 border-white/10 group-hover:rotate-[5deg] transition-transform duration-500">
                <User className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
              </div>
            </div>
            <div className="space-y-1 relative z-10">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{user.name}</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-black">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-white/30 relative z-10">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Blood Group</p>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                  <p className="text-xl font-black text-white/80">{user.bloodGroup || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Age</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <p className="text-xl font-black text-white/80">{user.age || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-card p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00d2ff]/5 blur-[100px] rounded-full -ml-32 -mb-32" />
            <div className="flex justify-between items-center mb-6 sm:mb-10 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Personal Details</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#00d2ff] hover:text-[#00d2ff]/80 transition-colors flex items-center gap-2"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                    <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <input
                    type="email"
                    disabled={true}
                    value={formData.email}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 opacity-50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Age
                  </label>
                    <input
                    type="number"
                    min="0"
                    max="99"
                    disabled={!isEditing}
                    value={formData.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = Number(val);
                      if ((numVal >= 0 && numVal <= 99) || val === '') {
                        setFormData({ ...formData, age: val });
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <User className="w-3 h-3" /> Sex
                  </label>
                    <select
                    disabled={!isEditing}
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50 appearance-none text-white"
                  >
                    <option value="Male" className="bg-zinc-900 text-white">Male</option>
                    <option value="Female" className="bg-zinc-900 text-white">Female</option>
                    <option value="Other" className="bg-zinc-900 text-white">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative w-24 shrink-0">
                      <select
                        disabled={!isEditing}
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-3 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50 appearance-none text-sm"
                      >
                        <option value="+91" className="bg-zinc-900">+91 (IN)</option>
                        <option value="+92" className="bg-zinc-900">+92 (PK)</option>
                        <option value="+1" className="bg-zinc-900">+1 (US)</option>
                        <option value="+44" className="bg-zinc-900">+44 (UK)</option>
                        <option value="+880" className="bg-zinc-900">+880 (BD)</option>
                        <option value="+977" className="bg-zinc-900">+977 (NP)</option>
                        <option value="+94" className="bg-zinc-900">+94 (LK)</option>
                      </select>
                    </div>
                    <div className="relative flex-1">
                        <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 10) {
                            setFormData({ ...formData, mobile: val });
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Droplets className="w-3 h-3" /> Blood Group
                  </label>
                    <select
                    disabled={!isEditing}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50 appearance-none text-white"
                  >
                    <option value="" disabled className="bg-zinc-900 text-white">Select Blood Group</option>
                    <option value="A+" className="bg-zinc-900 text-white">A+</option>
                    <option value="A-" className="bg-zinc-900 text-white">A-</option>
                    <option value="B+" className="bg-zinc-900 text-white">B+</option>
                    <option value="B-" className="bg-zinc-900 text-white">B-</option>
                    <option value="AB+" className="bg-zinc-900 text-white">AB+</option>
                    <option value="AB-" className="bg-zinc-900 text-white">AB-</option>
                    <option value="O+" className="bg-zinc-900 text-white">O+</option>
                    <option value="O-" className="bg-zinc-900 text-white">O-</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                <textarea
                  disabled={!isEditing}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#00d2ff]/50 disabled:opacity-50 h-24 resize-none"
                />
              </div>

              {isEditing && (
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00d2ff]/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-400 font-bold justify-center"
                >
                  <CheckCircle2 className="w-5 h-5" /> Profile updated successfully!
                </motion.div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
