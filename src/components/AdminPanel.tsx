import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  User as UserIcon,
  Stethoscope, 
  Pill, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  CheckCircle2, 
  X,
  Search,
  Clock,
  Check,
  Phone,
  Calendar,
  Mail,
  Activity,
  RefreshCw,
  AlertCircle,
  Download,
  Filter,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, Doctor, Medicine, Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPanel({ user }: { user: UserProfile }) {
  const { token, logout } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ users: 0, visits: 0 });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'patients' | 'doctors' | 'medicines' | 'requests' | 'reports'>('stats');
  
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [newDoctor, setNewDoctor] = useState({ name: '', department: '', experience: '', phone: '', countryCode: '+91' });
  const [doctorAvailability, setDoctorAvailability] = useState<{ day: string; slots: string[] }[]>([
    { day: 'Monday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
    { day: 'Tuesday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
    { day: 'Wednesday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
    { day: 'Thursday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
    { day: 'Friday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
    { day: 'Saturday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
  ]);
  
  const [customTime, setCustomTime] = useState<Record<string, string>>({});
  const countryCodes = [
    { code: '+91', name: 'India' },
    { code: '+92', name: 'Pakistan' },
    { code: '+1', name: 'USA' },
    { code: '+44', name: 'UK' },
    { code: '+61', name: 'Australia' },
    { code: '+971', name: 'UAE' },
    { code: '+880', name: 'Bangladesh' },
    { code: '+94', name: 'Sri Lanka' },
    { code: '+977', name: 'Nepal' }
  ];
  
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [newMedicine, setNewMedicine] = useState({ name: '', category: '', description: '' });
  const [selectedDoctorForReport, setSelectedDoctorForReport] = useState<Doctor | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'week' | 'month'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const getFilteredAppointments = (apts: Appointment[]) => {
    if (reportFilter === 'all') return apts;
    const now = new Date();
    return apts.filter(a => {
      const date = new Date(a.time);
      if (reportFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }
      if (reportFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= monthAgo;
      }
      return true;
    });
  };

  const handleDownloadReport = () => {
    const confirmedApts = appointments.filter(a => a.status === 'confirmed');
    const filtered = getFilteredAppointments(confirmedApts);
    
    if (filtered.length === 0) {
      toast.error('No data found for the selected period.');
      return;
    }

    const headers = ['Patient Name', 'Doctor Name', 'Department', 'Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(a => [
        `"${a.userName || 'Unknown'}"`,
        `"${a.doctorName}"`,
        `"${doctors.find(d => d.name === a.doctorName)?.department || 'Unknown'}"`,
        `"${format(new Date(a.time), 'yyyy-MM-dd HH:mm')}"`,
        `"${a.status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `health-report-${reportFilter}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch Patients
      const patientsRes = await fetch('/api/admin/patients', { headers });
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.map((p: any) => ({ ...p, uid: p.id })));
      }

      // Fetch Doctors
      const doctorsRes = await fetch('/api/doctors', { headers });
      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json();
        setDoctors(doctorsData);
      }

      // Fetch Medicines
      const medicinesRes = await fetch('/api/medicines', { headers });
      if (medicinesRes.ok) {
        const medicinesData = await medicinesRes.json();
        setMedicines(medicinesData);
      }

      // Fetch Appointments
      const appointmentsRes = await fetch('/api/admin/appointments', { headers });
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Data fetch error:', err);
      setError('Failed to fetch data from server.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user.role !== 'admin') return;
    fetchData();
  }, [user.role, fetchData]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      const doctorData = {
        ...newDoctor,
        phone: `${newDoctor.countryCode} ${newDoctor.phone}`,
        availability: doctorAvailability
      };

      if (editingDoctor) {
        const res = await fetch(`/api/doctors/${editingDoctor.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(doctorData)
        });
        if (!res.ok) throw new Error('Failed to update doctor');
        setEditingDoctor(null);
        toast.success('Doctor updated successfully');
      } else {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers,
          body: JSON.stringify(doctorData)
        });
        if (!res.ok) throw new Error('Failed to add doctor');
        toast.success('Doctor added successfully');
      }
      setNewDoctor({ name: '', department: '', experience: '', phone: '', countryCode: '+91' });
      setShowAddDoctor(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving doctor');
    }
  };

  const sendEmail = async (to: string, subject: string, text: string, html: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to, subject, text, html }),
      });
      const data = await response.json();
      if (data.simulated) {
        console.log('Email simulated:', data.message);
        return { success: true, simulated: true };
      } else if (!data.success) {
        console.error('Failed to send email:', data.error);
        return { success: false, error: data.error };
      }
      return { success: true, simulated: false };
    } catch (err: any) {
      console.error('Error calling send-email API:', err);
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  const handleApproveAppointment = async (apt: Appointment) => {
    try {
      const res = await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (!res.ok) throw new Error('Failed to approve appointment');
      
      const patientEmail = apt.userEmail || apt.userId;
      const formattedTime = format(new Date(apt.time), 'MMM d, h:mm a');
      
      const subject = "Appointment Confirmed - HealthApp";
      const text = `Hello ${apt.userName || 'Patient'},\n\nYour appointment with ${apt.doctorName} has been confirmed for ${formattedTime}.\n\nPlease arrive 15 minutes early.\n\nThank you!`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ff4e00;">Appointment Confirmed!</h2>
          <p>Hello <strong>${apt.userName || 'Patient'}</strong>,</p>
          <p>Your appointment with <strong>${apt.doctorName}</strong> has been confirmed.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Date & Time:</strong> ${formattedTime}</p>
            <p style="margin: 5px 0 0 0;"><strong>Doctor:</strong> ${apt.doctorName}</p>
          </div>
          <p>Please arrive 15 minutes before your scheduled time.</p>
          <p>Thank you for choosing HealthApp!</p>
        </div>
      `;

      const emailResult = await sendEmail(patientEmail, subject, text, html);
      if (emailResult.success) {
        toast.success('Booking Confirmed', {
          description: `A confirmation email has been sent to: ${patientEmail}`
        });
      } else {
        toast.warning('Booking Confirmed', {
          description: `⚠️ However, the confirmation email could not be sent. Error: ${emailResult.error}`
        });
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error approving appointment');
    }
  };

  const handleCompleteAppointment = async (apt: Appointment) => {
    try {
      const res = await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      if (!res.ok) throw new Error('Failed to complete appointment');
      
      const patientEmail = apt.userEmail || apt.userId;
      const subject = "Thank you for your visit - HealthApp";
      const text = `Hello ${apt.userName || 'Patient'},\n\nThank you for visiting us today for your appointment with ${apt.doctorName}.\n\nWe hope you had a good experience. Thank you, visit again!`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">Thank you for your visit!</h2>
          <p>Hello <strong>${apt.userName || 'Patient'}</strong>,</p>
          <p>We hope you had a good experience during your visit with <strong>${apt.doctorName}</strong> today.</p>
          <p style="font-size: 1.1em; font-weight: bold; color: #ff4e00;">Thank you, visit again!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #888;">HealthApp - Your Trusted Healthcare Partner</p>
        </div>
      `;

      const emailResult = await sendEmail(patientEmail, subject, text, html);
      if (emailResult.success) {
        toast.success('Visit Completed', {
          description: `A "Thank you" email has been sent to: ${patientEmail}`
        });
      } else {
        toast.warning('Visit Completed', {
          description: `⚠️ However, the "Thank you" email could not be sent. Error: ${emailResult.error}`
        });
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error completing appointment');
    }
  };

  const toggleDaySlot = (day: string, slot: string) => {
    setDoctorAvailability(prev => {
      const dayExists = prev.find(d => d.day === day);
      if (!dayExists) {
        return [...prev, { day, slots: [slot] }];
      }
      return prev.map(d => {
        if (d.day === day) {
          const slots = d.slots.includes(slot) 
            ? d.slots.filter(s => s !== slot)
            : [...d.slots, slot].sort();
          return { ...d, slots };
        }
        return d;
      });
    });
  };

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      if (editingMedicine) {
        const res = await fetch(`/api/medicines/${editingMedicine.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(newMedicine)
        });
        if (!res.ok) throw new Error('Failed to update medicine');
        setEditingMedicine(null);
        toast.success('Medicine updated successfully');
      } else {
        const res = await fetch('/api/medicines', {
          method: 'POST',
          headers,
          body: JSON.stringify(newMedicine)
        });
        if (!res.ok) throw new Error('Failed to add medicine');
        toast.success('Medicine added successfully');
      }
      setNewMedicine({ name: '', category: '', description: '' });
      setShowAddMedicine(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving medicine');
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const endpoint = coll === 'doctors' ? `/api/doctors/${id}` : 
                           coll === 'medicines' ? `/api/medicines/${id}` :
                           coll === 'appointments' ? `/api/admin/appointments/${id}` : '';
          
          if (!endpoint) return;

          const res = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!res.ok) throw new Error('Failed to delete record');

          if (coll === 'appointments') {
            toast.success('Booking Declined', {
              description: 'The appointment has been removed.'
            });
          } else {
            toast.success('Record deleted successfully');
          }
          fetchData();
        } catch (err: any) {
          toast.error(err.message || 'Error deleting record');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeletePatient = async (uid: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Patient',
      message: 'Are you sure you want to delete this patient profile? All associated records will remain but the profile will be removed.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/patients/${uid}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to delete patient');
          toast.success('Patient deleted successfully');
          fetchData();
        } catch (err: any) {
          toast.error(err.message || 'Error deleting patient');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <X className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-white/40">You do not have administrative privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 lg:w-96 h-64 lg:h-96 bg-[#00d2ff]/5 blur-[80px] lg:blur-[100px] rounded-full -mr-32 lg:-mr-48 -mt-32 lg:-mt-48 animate-pulse" />
        <div className="relative z-10 flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] rounded-xl lg:rounded-2xl flex items-center justify-center shadow-2xl shadow-[#00d2ff]/30">
            <ShieldCheck className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
          </div>
          <div className="space-y-0.5 lg:space-y-1">
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tighter text-gradient glow-text">Admin Control Center</h1>
            <div 
              className="flex items-center gap-2 text-white/40 font-medium text-[10px] lg:text-sm cursor-pointer hover:text-white/60 transition-colors"
              onClick={() => !refreshing && fetchData()}
              title="Click to refresh statistics"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Last synchronized: {format(lastUpdated, 'hh:mm:ss a')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-10 w-full lg:w-auto">
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar backdrop-blur-md">
            {[
              { id: 'stats', label: 'Overview', icon: Activity },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'doctors', label: 'Doctors', icon: Stethoscope },
              { id: 'medicines', label: 'Medicines', icon: Pill },
              { id: 'requests', label: 'Requests', icon: Clock },
              { id: 'reports', label: 'Reports', icon: Search }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 lg:gap-2.5 whitespace-nowrap relative group ${
                  activeSubTab === tab.id 
                    ? 'bg-[#00d2ff] text-white shadow-lg shadow-[#00d2ff]/20' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 transition-transform group-hover:scale-110 ${activeSubTab === tab.id ? 'text-white' : 'text-white/40'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                {tab.id === 'requests' && appointments.filter(a => a.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] lg:text-[9px] w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center rounded-full border-2 border-[#0a0a0a] font-black">
                    {appointments.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button 
            onClick={logout}
            className="group flex items-center justify-center gap-2.5 px-6 py-3 lg:py-3.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all font-black text-[10px] lg:text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-[#00d2ff] animate-spin" />
          <p className="text-white/40 animate-pulse">Synchronizing healthcare data...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'stats' && (
            <div className="space-y-6 lg:space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="glass-card p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 lg:gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Patients</p>
                    <h3 className="text-lg lg:text-2xl font-bold">{stats.users}</h3>
                  </div>
                </div>
                <div className="glass-card p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 lg:gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Visits</p>
                    <h3 className="text-lg lg:text-2xl font-bold">{stats.visits}</h3>
                  </div>
                </div>
                <div className="glass-card p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 lg:gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#00d2ff]/20 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-[#00d2ff]" />
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Doctors</p>
                    <h3 className="text-lg lg:text-2xl font-bold">{doctors.length}</h3>
                  </div>
                </div>
                <div className="glass-card p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 lg:gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Pending Requests</p>
                    <h3 className="text-lg lg:text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="glass-card p-5 lg:p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-sm lg:text-base">
                    <Clock className="w-4 h-4 text-[#00d2ff]" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map(apt => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${apt.status === 'confirmed' ? 'bg-green-500' : 'bg-[#00d2ff]'}`} />
                          <div>
                            <p className="text-xs lg:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{apt.doctorName}</p>
                            <p className="text-[9px] lg:text-[10px] text-white/40">{format(new Date(apt.time), 'MMM d, h:mm a')}</p>
                          </div>
                        </div>
                        <span className={`text-[8px] lg:text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                          apt.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-[#00d2ff]/20 text-[#00d2ff]'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5 lg:p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-sm lg:text-base">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    <button 
                      onClick={() => setActiveSubTab('requests')}
                      className="p-3 lg:p-4 bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 border border-[#00d2ff]/20 rounded-xl text-center transition-all group"
                    >
                      <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-[#00d2ff] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] lg:text-xs font-bold">Manage Requests</p>
                    </button>
                    <button 
                      onClick={() => setShowAddDoctor(true)}
                      className="p-3 lg:p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-center transition-all group"
                    >
                      <Plus className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] lg:text-xs font-bold">Add Doctor</p>
                    </button>
                    <button 
                      onClick={() => setActiveSubTab('reports')}
                      className="p-3 lg:p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl text-center transition-all group"
                    >
                      <Search className="w-5 h-5 lg:w-6 lg:h-6 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] lg:text-xs font-bold">View Reports</p>
                    </button>
                    <button 
                      onClick={() => setActiveSubTab('medicines')}
                      className="p-3 lg:p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-center transition-all group"
                    >
                      <Pill className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] lg:text-xs font-bold">Inventory</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'patients' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00d2ff]" />
                  Patient Management
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="Search patients..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00d2ff]/50"
                  />
                </div>
              </div>
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/10">
                        <th className="py-4 px-6">Patient Name</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6">Login Count</th>
                        <th className="py-4 px-6">Last Login</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {patients
                        .filter(p => 
                          p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          p.email.toLowerCase().includes(patientSearchTerm.toLowerCase())
                        )
                        .map((p) => (
                        <tr key={p.uid} className="text-sm hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold">{p.name}</td>
                          <td className="py-4 px-6 text-white/60">{p.email}</td>
                          <td className="py-4 px-6 font-mono text-[#00d2ff]">{p.loginCount || 0}</td>
                          <td className="py-4 px-6 text-white/40">
                            {p.lastLogin ? format(new Date(p.lastLogin), 'MMM d, h:mm a') : 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => handleDeletePatient(p.uid)}
                              className="text-white/20 hover:text-red-400 transition-all"
                              title="Delete Patient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patients.filter(p => 
                        p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                        p.email.toLowerCase().includes(patientSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-white/20 italic">
                            No patients found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

      {activeSubTab === 'doctors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#00d2ff]" />
              Doctors Management
            </h2>
            <button
              onClick={() => {
                setEditingDoctor(null);
                setNewDoctor({ name: '', department: '', experience: '', phone: '', countryCode: '+91' });
                setDoctorAvailability([
                  { day: 'Monday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                  { day: 'Tuesday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                  { day: 'Wednesday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                  { day: 'Thursday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                  { day: 'Friday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                  { day: 'Saturday', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'] },
                ]);
                setShowAddDoctor(true);
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {doctors.map((doc) => (
              <div key={doc.id} className="glass-card p-5 lg:p-6 space-y-4 group relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#00d2ff]/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-[#00d2ff]" />
                  </div>
                  <div className="flex gap-1 lg:gap-2">
                    <button 
                      onClick={() => {
                        setEditingDoctor(doc);
                        const phoneParts = ((doc as any).phone || '').split(' ');
                        const countryCode = phoneParts.length > 1 ? phoneParts[0] : '+91';
                        const phoneNumber = phoneParts.length > 1 ? phoneParts.slice(1).join('') : phoneParts[0];
                        setNewDoctor({ 
                          name: doc.name, 
                          department: doc.department, 
                          experience: doc.experience, 
                          phone: phoneNumber,
                          countryCode: countryCode
                        });
                        setDoctorAvailability(doc.availability);
                        setShowAddDoctor(true);
                      }}
                      className="p-2 text-white/20 hover:text-blue-400 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete('doctors', doc.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-base lg:text-lg truncate">{doc.name}</h3>
                  <p className="text-xs lg:text-sm text-[#00d2ff] font-medium">{doc.department}</p>
                  <div className="flex items-center gap-2 text-[10px] lg:text-xs text-white/40 mt-1">
                    <Phone className="w-3 h-3" />
                    {(doc as any).phone || 'N/A'}
                  </div>
                  <p className="text-[10px] lg:text-xs text-white/40 mt-1">{doc.experience} Experience</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Availability</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                    {doc.availability.map((avail) => (
                      <div key={avail.day} className="flex justify-between items-center text-[9px] lg:text-[10px] bg-white/5 p-2 rounded-lg">
                        <span className="font-bold text-[#00d2ff]/80">{avail.day}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {avail.slots.map(slot => (
                            <span key={slot} className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">{slot}</span>
                          ))}
                          {avail.slots.length === 0 && <span className="text-white/20 italic">No slots</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'medicines' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#00d2ff]" />
              Medicines Management
            </h2>
            <button
              onClick={() => setShowAddMedicine(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Medicine
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/10">
                    <th className="py-4 px-6">Medicine Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {medicines.map((med) => (
                    <tr key={med.id} className="text-sm hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-bold">{med.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase">
                          {med.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white/40 max-w-xs truncate">{med.description}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingMedicine(med);
                              setNewMedicine({ name: med.name, category: med.category, description: med.description });
                              setShowAddMedicine(true);
                            }}
                            className="text-white/20 hover:text-blue-400 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete('medicines', med.id)}
                            className="text-white/20 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00d2ff]" />
              Pending Appointment Requests
            </h2>
            <span className="bg-[#00d2ff]/20 text-[#00d2ff] px-3 py-1 rounded-full text-xs font-bold">
              {appointments.filter(a => a.status === 'pending').length} New Requests
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {appointments.filter(a => a.status === 'pending').map((apt) => (
              <div key={apt.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-[#00d2ff]">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border-2 border-[#00d2ff]/20 relative">
                    <UserIcon className="w-8 h-8 text-white/40" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00d2ff] rounded-full flex items-center justify-center border-2 border-[#0a0502]">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">Appointment Request</h3>
                      <span className="text-[10px] bg-[#00d2ff]/10 text-[#00d2ff] px-2 py-0.5 rounded uppercase font-bold tracking-tighter">New</span>
                    </div>
                    <p className="text-sm text-white/60">Patient ID: <span className="text-white font-medium">{apt.userId}</span></p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <Stethoscope className="w-3.5 h-3.5 text-[#00d2ff]" />
                        {apt.doctorName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <Calendar className="w-3.5 h-3.5 text-[#00d2ff]" />
                        {format(new Date(apt.time), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <Clock className="w-3.5 h-3.5 text-[#00d2ff]" />
                        {format(new Date(apt.time), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => handleApproveAppointment(apt)}
                    className="flex-1 md:flex-none bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00d2ff]/20"
                  >
                    <Check className="w-4 h-4" />
                    Accept Request
                  </button>
                  <button 
                    onClick={() => handleDelete('appointments', apt.id)}
                    className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-white/60 px-8 py-3 rounded-xl font-bold transition-all border border-white/10"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {appointments.filter(a => a.status === 'pending').length === 0 && (
              <div className="glass-card p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 italic">No pending requests at the moment.</p>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold mt-8">Confirmed Appointments</h3>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/10">
                    <th className="py-4 px-6">Doctor</th>
                    <th className="py-4 px-6">Time</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {appointments.filter(a => a.status === 'confirmed').map((apt) => (
                    <tr key={apt.id} className="text-sm">
                      <td className="py-4 px-6 font-bold">
                        <div>
                          {apt.doctorName}
                          <p className="text-[10px] text-white/40 font-normal">Patient: {apt.userName || apt.userId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white/60">{format(new Date(apt.time), 'MMM d, h:mm a')}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase">
                          Confirmed
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleCompleteAppointment(apt)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                            title="Mark as Completed"
                          >
                            Complete
                          </button>
                          <button 
                            onClick={() => handleDelete('appointments', apt.id)}
                            className="text-white/20 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      <AnimatePresence>
        {showAddDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddDoctor(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-2xl glass-card p-5 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold">{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                <button onClick={() => {
                  setShowAddDoctor(false);
                  setEditingDoctor(null);
                  setNewDoctor({ name: '', department: '', experience: '', phone: '', countryCode: '+91' });
                }} className="text-white/40 hover:text-white"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>
              <form onSubmit={handleAddDoctor} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newDoctor.name}
                      onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                      placeholder="Dr. Smith"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Department</label>
                    <input
                      type="text"
                      required
                      value={newDoctor.department}
                      onChange={(e) => setNewDoctor({...newDoctor, department: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                      placeholder="Cardiology"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={newDoctor.countryCode}
                        onChange={(e) => setNewDoctor({...newDoctor, countryCode: e.target.value})}
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-2 focus:outline-none focus:border-[#00d2ff]/50 text-xs sm:text-sm"
                      >
                        {countryCodes.map(c => (
                          <option key={c.code} value={c.code} className="bg-zinc-900">{c.code} ({c.name})</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        value={newDoctor.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length <= 10) {
                            setNewDoctor({...newDoctor, phone: val});
                          }
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Experience</label>
                    <input
                      type="text"
                      required
                      value={newDoctor.experience}
                      onChange={(e) => setNewDoctor({...newDoctor, experience: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                      placeholder="10+ Years"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Detailed Timetable</h3>
                  <div className="space-y-3">
                    {days.map(day => (
                      <div key={day} className="space-y-2 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm font-bold text-[#00d2ff]">{day}</span>
                          <span className="text-[9px] text-white/40 uppercase tracking-widest">Select Slots</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {timeSlots.map(slot => {
                            const isSelected = doctorAvailability.find(d => d.day === day)?.slots.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => toggleDaySlot(day, slot)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                                  isSelected 
                                    ? 'bg-[#00d2ff] text-white' 
                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                          {/* Custom Slot Input */}
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={customTime[day] || ''}
                              onChange={(e) => setCustomTime({ ...customTime, [day]: e.target.value })}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-[#00d2ff]/50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customTime[day]) {
                                  toggleDaySlot(day, customTime[day]);
                                  setCustomTime({ ...customTime, [day]: '' });
                                }
                              }}
                              className="bg-[#00d2ff]/20 text-[#00d2ff] p-1.5 rounded-lg hover:bg-[#00d2ff]/30 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Display existing slots including custom ones */}
                        {doctorAvailability.find(d => d.day === day)?.slots.filter(s => !timeSlots.includes(s)).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                            {doctorAvailability.find(d => d.day === day)?.slots.filter(s => !timeSlots.includes(s)).map(slot => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => toggleDaySlot(day, slot)}
                                className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-[#00d2ff] text-white flex items-center gap-1"
                              >
                                {slot}
                                <X className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-3.5 sm:py-4 rounded-xl transition-all shadow-xl shadow-[#00d2ff]/20 text-sm sm:text-base">
                  Save Doctor & Timetable
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Medicine Modal */}
      <AnimatePresence>
        {showAddMedicine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddMedicine(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md glass-card p-6 sm:p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold">{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
                <button onClick={() => {
                  setShowAddMedicine(false);
                  setEditingMedicine(null);
                  setNewMedicine({ name: '', category: '', description: '' });
                }} className="text-white/40 hover:text-white"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>
              <form onSubmit={handleAddMedicine} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Medicine Name</label>
                  <input
                    type="text"
                    required
                    value={newMedicine.name}
                    onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                    placeholder="Aspirin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Category</label>
                  <input
                    type="text"
                    required
                    value={newMedicine.category}
                    onChange={(e) => setNewMedicine({...newMedicine, category: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 text-sm"
                    placeholder="Pain Relief"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Description</label>
                  <textarea
                    required
                    value={newMedicine.description}
                    onChange={(e) => setNewMedicine({...newMedicine, description: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#00d2ff]/50 h-24 resize-none text-sm"
                    placeholder="Used to reduce pain, fever, or inflammation..."
                  />
                </div>
                <button type="submit" className="w-full bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-3 sm:py-3.5 rounded-xl transition-all shadow-xl shadow-[#00d2ff]/20 text-sm sm:text-base">
                  Save Medicine
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeSubTab === 'reports' && (
        <div className="space-y-6 lg:space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg lg:text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00d2ff]" />
              Healthcare Performance Reports
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 flex-1 sm:flex-none">
                {(['all', 'week', 'month'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      reportFilter === f ? 'bg-[#00d2ff] text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleDownloadReport}
                className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-lg text-white/60 transition-all"
                title="Download Full Report"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 glass-card p-4 sm:p-6 space-y-6">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Doctor Performance (Visits)</h3>
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doctors.map(doc => ({
                    name: doc.name.split(' ').pop(),
                    visits: getFilteredAppointments(appointments).filter(a => a.doctorName === doc.name && a.status === 'confirmed').length
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#00d2ff' }}
                    />
                    <Bar dataKey="visits" fill="#00d2ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6 space-y-6">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Department Distribution</h3>
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(doctors.reduce((acc, doc) => {
                        acc[doc.department] = (acc[doc.department] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {doctors.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#00d2ff', '#3a7bd5', '#10b981', '#8b5cf6'][index % 4]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="glass-card p-5 sm:p-6 border-l-4 border-[#3a7bd5]">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Appointments</p>
              <h3 className="text-2xl sm:text-3xl font-bold">{getFilteredAppointments(appointments).filter(a => a.status === 'confirmed').length}</h3>
              <p className="text-[9px] sm:text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                +12% from last period
              </p>
            </div>
            <div className="glass-card p-5 sm:p-6 border-l-4 border-green-500">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Patient Satisfaction</p>
              <h3 className="text-2xl sm:text-3xl font-bold">98.4%</h3>
              <p className="text-[9px] sm:text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Excellent rating
              </p>
            </div>
            <div className="glass-card p-5 sm:p-6 border-l-4 border-[#00d2ff]">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Avg. Wait Time</p>
              <h3 className="text-2xl sm:text-3xl font-bold">14m</h3>
              <p className="text-[9px] sm:text-[10px] text-[#00d2ff] mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Optimized flow
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {doctors.map(doc => {
              const docApts = appointments.filter(a => a.doctorName === doc.name && a.status === 'confirmed');
              const filteredApts = getFilteredAppointments(docApts);

              return (
                <div 
                  key={doc.id} 
                  className="glass-card p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all group border border-white/5 hover:border-[#00d2ff]/30"
                  onClick={() => setSelectedDoctorForReport(doc)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#00d2ff]/10 rounded-lg flex items-center justify-center group-hover:bg-[#00d2ff]/20 transition-colors">
                      <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-[#00d2ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold group-hover:text-[#00d2ff] transition-colors truncate max-w-[120px] sm:max-w-none">{doc.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-bold tracking-tighter">{doc.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl sm:text-2xl font-bold text-[#00d2ff]">{filteredApts.length}</p>
                    <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-bold">Visits</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Doctor Visits Patient Details Modal */}
      <AnimatePresence>
        {selectedDoctorForReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDoctorForReport(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-2xl glass-card p-8 space-y-6 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-2xl font-bold">Patient Visits</h2>
                  <p className="text-white/40">Dr. {selectedDoctorForReport.name} - {selectedDoctorForReport.department}</p>
                </div>
                <button onClick={() => setSelectedDoctorForReport(null)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {getFilteredAppointments(appointments.filter(a => a.doctorName === selectedDoctorForReport.name && a.status === 'confirmed'))
                  .map((apt) => {
                    const patient = patients.find(p => p.uid === apt.userId);
                    return (
                      <div key={apt.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#00d2ff]/20 flex items-center justify-center text-[#00d2ff] font-bold">
                            {patient?.name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="font-bold">{patient?.name || 'Unknown Patient'}</p>
                            <p className="text-xs text-white/40">{patient?.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{format(new Date(apt.time), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-white/40">{format(new Date(apt.time), 'hh:mm a')}</p>
                        </div>
                      </div>
                    );
                  })}
                {getFilteredAppointments(appointments.filter(a => a.doctorName === selectedDoctorForReport.name && a.status === 'confirmed')).length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    No confirmed visits for this doctor yet.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
    )}
    </div>
  );
}
