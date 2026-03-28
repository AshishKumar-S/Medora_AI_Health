import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Plus, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { UserProfile, Doctor, Appointment } from '../types';
import { format, addDays, startOfToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';

export default function Appointments({ user }: { user: UserProfile }) {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
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

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [docsRes, aptsRes] = await Promise.all([
        fetch('/api/doctors', { headers }),
        fetch('/api/appointments', { headers })
      ]);

      const docsData = await docsRes.json();
      const aptsData = await aptsRes.json();

      setDoctors(docsData);
      setAppointments(aptsData);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch appointments data:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedDoctor && showBooking) {
      const dayName = format(selectedDate, 'EEEE');
      const isAvailable = selectedDoctor.availability.some(d => d.day === dayName && d.slots.length > 0);
      
      if (!isAvailable) {
        for (let i = 0; i < 14; i++) {
          const date = addDays(new Date(), i);
          const dName = format(date, 'EEEE');
          if (selectedDoctor.availability.some(d => d.day === dName && d.slots.length > 0)) {
            setSelectedDate(date);
            break;
          }
        }
      }
    }
  }, [selectedDoctor, showBooking]);

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate, selectedDoctor]);

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedTime) return;
    
    setBookingLoading(true);
    try {
      const appointmentTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentTime.setHours(parseInt(hours), parseInt(minutes));

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          userName: user.name,
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          time: appointmentTime.toISOString(),
          status: 'pending'
        })
      });

      if (res.ok) {
        toast.success('Appointment Requested', {
          description: "We've received your request. You'll receive an email once it's confirmed."
        });
        setShowBooking(false);
        setSelectedDoctor(null);
        setSelectedTime('');
        fetchData();
      } else {
        toast.error('Failed to book appointment');
      }
    } catch (err) {
      console.error("Error booking appointment:", err);
      toast.error('Error booking appointment');
    } finally {
      setBookingLoading(false);
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
      return { success: true, simulated: data.simulated };
    } catch (err: any) {
      console.error('Error calling send-email API:', err);
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  const handleCancel = async (apt: Appointment) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/appointments/${apt.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'cancelled' })
          });

          if (res.ok) {
            const patientEmail = apt.userEmail || user.email;
            const formattedTime = format(new Date(apt.time), 'MMM d, h:mm a');
            
            const subject = "Appointment Cancelled - HealthApp";
            const text = `Hello ${apt.userName || user.name},\n\nYour appointment with ${apt.doctorName} for ${formattedTime} has been successfully cancelled.\n\nThank you!`;
            const html = `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #ef4444;">Appointment Cancelled</h2>
                <p>Hello <strong>${apt.userName || user.name}</strong>,</p>
                <p>Your appointment with <strong>${apt.doctorName}</strong> has been successfully cancelled.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                  <p style="margin: 0;"><strong>Original Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Doctor:</strong> ${apt.doctorName}</p>
                </div>
                <p>If you wish to reschedule, please visit our app.</p>
                <p>Thank you!</p>
              </div>
            `;

            await sendEmail(patientEmail, subject, text, html);
            toast.success('Appointment Cancelled');
            fetchData();
          } else {
            toast.error('Failed to cancel appointment');
          }
        } catch (err) {
          console.error("Error cancelling appointment:", err);
          toast.error('Error cancelling appointment');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getAvailableSlots = () => {
    if (!selectedDoctor) return [];
    const dayName = format(selectedDate, 'EEEE'); // e.g., 'Monday'
    const dayAvail = selectedDoctor.availability.find(d => d.day === dayName);
    return dayAvail ? dayAvail.slots : [];
  };

  const availableSlots = getAvailableSlots();

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 p-4">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-xs lg:text-sm text-white/40">Manage your medical consultations</p>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          className="w-full sm:w-auto bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00d2ff]/20"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00d2ff]" />
            Your Schedule
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#00d2ff]" />
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="glass-card p-4 sm:p-6 flex flex-col space-y-4 group hover:border-[#00d2ff]/30 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center">
                        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white/40" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg">{apt.doctorName}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-sm text-white/40">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(apt.time), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(apt.time), 'h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        apt.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 
                        apt.status === 'pending' ? 'bg-[#00d2ff]/20 text-[#00d2ff]' : 
                        apt.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>

                  {apt.status === 'confirmed' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 text-blue-400"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Appointment Confirmed!</p>
                        <p className="text-xs opacity-80">A confirmation email has been sent to {user.email}. Please arrive 15 mins early.</p>
                      </div>
                    </motion.div>
                  )}

                  {apt.status === 'completed' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Thank you for your visit!</p>
                        <p className="text-xs opacity-80">A confirmation email has been sent to {user.email}. Visit again!</p>
                      </div>
                    </motion.div>
                  )}

                  {apt.status === 'pending' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded-xl flex items-center gap-3 text-[#00d2ff]"
                    >
                      <Clock className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Booking Received!</p>
                        <p className="text-xs opacity-80">We've received your request. You'll receive an email once it's confirmed.</p>
                      </div>
                    </motion.div>
                  )}

                  {apt.status === 'pending' && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleCancel(apt)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                  {apt.status === 'cancelled' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
                    >
                      <XCircle className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Appointment Cancelled</p>
                        <p className="text-xs opacity-80">This appointment has been cancelled. A notification has been sent.</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full mx-auto flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40">No appointments scheduled yet.</p>
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#00d2ff]" />
              Important Notice
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Please arrive at least 15 minutes before your scheduled appointment time. 
              Bring your ID and any relevant medical history documents.
            </p>
            <div className="p-4 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded-xl">
              <p className="text-xs text-[#00d2ff] font-medium">
                Cancellations must be made at least 24 hours in advance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBooking(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-card overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl sm:text-2xl font-bold">Book Appointment</h2>
                  <button onClick={() => setShowBooking(false)} className="text-white/40 hover:text-white">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Step 1: Select Doctor */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Doctor</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doctors.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-3 sm:p-4 rounded-xl border transition-all text-left ${
                            selectedDoctor?.id === doc.id 
                              ? 'bg-[#00d2ff]/20 border-[#00d2ff] text-white' 
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <p className="font-bold text-sm sm:text-base">{doc.name}</p>
                          <p className="text-[10px] sm:text-xs opacity-60">{doc.department}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Select Date & Time */}
                  {selectedDoctor && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Date</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((offset) => {
                            const date = addDays(new Date(), offset);
                            const dayName = format(date, 'EEEE');
                            const isAvailable = selectedDoctor.availability.some(d => d.day === dayName && d.slots.length > 0);
                            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                            
                            if (!isAvailable) return null;

                            return (
                              <button
                                key={offset}
                                onClick={() => setSelectedDate(date)}
                                className={`flex-shrink-0 w-16 sm:w-20 py-2 sm:py-3 rounded-xl border transition-all flex flex-col items-center ${
                                  isSelected 
                                    ? 'bg-[#00d2ff] border-[#00d2ff] text-white' 
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase">{format(date, 'EEE')}</span>
                                <span className="text-base sm:text-lg font-bold">{format(date, 'd')}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Time</label>
                        {availableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {availableSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                                  selectedTime === time 
                                    ? 'bg-[#00d2ff] border-[#00d2ff] text-white' 
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                            <p className="text-xs text-red-400 font-medium">No slots available for this day.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  onClick={handleBooking}
                  disabled={!selectedDoctor || !selectedTime || bookingLoading}
                  className="w-full bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-3.5 sm:py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#00d2ff]/20 disabled:opacity-50 text-sm sm:text-base"
                >
                  {bookingLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
