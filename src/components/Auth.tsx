import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Phone, Calendar, Droplets, MapPin, Eye, EyeOff } from 'lucide-react';
import MedoraLogo from './MedoraLogo';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const ADMIN_EMAIL = "ashishkumarsenapati556@gmail.com";

export default function Auth() {
  const { login, register } = useAuth();
  const [step, setStep] = useState(1); // 1: Selection, 2: Form
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const isAdminEmail = email === ADMIN_EMAIL;

      if (isAdminMode && !isAdminEmail) {
        setError("You are not an admin continue with user");
        setLoading(false);
        return;
      }

      if (!isAdminMode && isAdminEmail) {
        setError("You are not a user, please login via Admin Access");
        setLoading(false);
        return;
      }

      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        if (!isAdminEmail && (!name || !age || !sex || !mobile || !bloodGroup || !address)) {
          setError('Please fill in all profile details');
          setLoading(false);
          return;
        }

        if (!isAdminEmail && mobile.length !== 10) {
          setError('Mobile number must be exactly 10 digits');
          setLoading(false);
          return;
        }

        await register(
          name || (isAdminEmail ? 'System Admin' : ''), 
          email, 
          password, 
          isAdminEmail ? 'admin' : 'patient',
          age,
          sex,
          mobile,
          bloodGroup,
          address
        );
        toast.success('Account created successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const clearFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setAge('');
    setCountryCode('+91');
    setMobile('');
    setBloodGroup('');
    setAddress('');
    setError('');
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="atmosphere" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full ${step === 1 ? 'max-w-md' : (isLogin ? 'max-w-md' : 'max-w-2xl')} glass-card p-6 sm:p-8 space-y-6 sm:space-y-8 relative z-10 transition-all duration-300`}
      >
        <div className="text-center space-y-4">
          <MedoraLogo size="lg" className="mx-auto mb-6" />
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-gradient glow-text uppercase">Medora</h1>
            <p className="text-white/40 font-bold text-[10px] sm:text-xs tracking-[0.2em] uppercase">Advanced AI Health Companion</p>
          </div>
          
          {step === 1 && (
            <div className="pt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    clearFields();
                    setIsLogin(true);
                    setIsAdminMode(true);
                    setStep(2);
                  }}
                  className="group relative w-full py-5 rounded-2xl text-[11px] uppercase tracking-[0.3em] font-black transition-all border border-white/5 flex items-center justify-center gap-4 bg-white/5 text-white/40 hover:border-[#00d2ff]/50 hover:text-[#00d2ff] hover:bg-[#00d2ff]/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00d2ff]/0 via-[#00d2ff]/5 to-[#00d2ff]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10">Admin Portal Access</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    clearFields();
                    setIsAdminMode(false);
                    setIsLogin(true);
                    setStep(2);
                  }}
                  className="group relative w-full py-5 rounded-2xl text-[11px] uppercase tracking-[0.3em] font-black transition-all border border-white/5 flex items-center justify-center gap-4 bg-white/5 text-white/40 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10">User Login</span>
                </button>
              </div>

              <div className="flex items-center gap-4 pt-6">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">New Here?</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button
                onClick={() => {
                  clearFields();
                  setIsLogin(false);
                  setIsAdminMode(false);
                  setStep(2);
                }}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
              >
                Create an Account
              </button>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setStep(1);
                    clearFields();
                  }}
                  className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all border border-white/5"
                  title="Back"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-[#00d2ff] font-black">
                {isAdminMode ? 'Admin Portal' : (isLogin ? 'User Login' : 'Create Account')}
              </span>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && !isAdminMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
                        placeholder="John Doe"
                        required={!isLogin && !isAdminMode}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Age</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={age}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = Number(val);
                          if ((numVal >= 0 && numVal <= 99) || val === '') setAge(val);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
                        placeholder="25"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Sex</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all appearance-none text-white"
                        required={!isLogin}
                      >
                        <option value="Male" className="bg-zinc-900 text-white">Male</option>
                        <option value="Female" className="bg-zinc-900 text-white">Female</option>
                        <option value="Other" className="bg-zinc-900 text-white">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Mobile</label>
                    <div className="flex gap-2">
                      <div className="relative w-24 shrink-0">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-3 focus:outline-none focus:border-[#00d2ff]/50 transition-all appearance-none text-sm"
                          required={!isLogin}
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
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          type="text"
                          value={mobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) {
                              setMobile(val);
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
                          placeholder="1234567890"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Blood Group</label>
                    <div className="relative">
                      <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all appearance-none text-white"
                        required={!isLogin}
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

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 w-5 h-5 text-white/40" />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all h-20 resize-none"
                        placeholder="123 Health St, Medical City"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
                    placeholder="name@example.com"
                    required
                    autoComplete="off"
                    name={`email_${Date.now()}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">{isLogin ? 'Password' : 'Create Password'}</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    name={`pass_${Date.now()}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00d2ff] to-[#0072ff] hover:from-[#00d2ff] hover:to-[#0072ff] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00d2ff]/20 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <p className="text-center text-sm text-white/40">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                }}
                className="text-[#00d2ff] font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
