import React, { useState, useRef } from 'react';
import { Stethoscope, Search, History, Loader2, AlertCircle, CheckCircle2, MapPin, Phone, Clock, User, Info, Pill, Check, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, Prediction, Doctor } from '../types';
import { aiService, AIProvider } from '../lib/ai-service';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function SymptomChecker({ user }: { user: UserProfile }) {
  const { token, updateProfile } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState(() => localStorage.getItem('symptom_age') || user.age?.toString() || '');
  const [sex, setSex] = useState(() => localStorage.getItem('symptom_sex') || user.sex || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [suggestedDoctors, setSuggestedDoctors] = useState<Doctor[]>([]);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPrescription(true);
    setError('');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const response = await aiService.generateContent(
        [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type
            }
          },
          {
            text: "Analyze this image. Is it a medical prescription? If it is a prescription, extract the symptoms, diagnosis, and medicines mentioned. If it is NOT a medical prescription, return 'INVALID'. If it IS a prescription, return a JSON object: { \"isPrescription\": true, \"summary\": \"extracted symptoms and medicines\" }. If it is NOT a prescription, return { \"isPrescription\": false }."
          }
        ],
        {
          responseMimeType: "application/json",
          maxOutputTokens: 512,
        },
        provider
      );

      const text = response.text || '{}';
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(jsonStr);
      
      if (data.isPrescription) {
        setSymptoms(prev => prev ? `${prev}\n\nFrom Prescription: ${data.summary}` : `From Prescription: ${data.summary}`);
        toast.success('Prescription analyzed successfully!');
      } else {
        setError("This doesn't look like a medical prescription. Please upload a valid one.");
        toast.error('Invalid prescription');
      }
    } catch (err: any) {
      console.error("Prescription Analysis Error:", err);
      setError(`AI Error: ${err.message || "Failed to process prescription. Please try again."}`);
    } finally {
      setUploadingPrescription(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePredict = async () => {
    if (!symptoms.trim() || !age || !sex) {
      setError("Please fill in all details (symptoms, age, and sex).");
      return;
    }
    
    // Persist to localStorage and profile
    localStorage.setItem('symptom_age', age);
    localStorage.setItem('symptom_sex', sex);
    try {
      await updateProfile({ age: parseInt(age), sex: sex as any });
    } catch (e) {
      console.error("Failed to update profile with symptoms defaults:", e);
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    setSuggestedDoctors([]);

    try {
      const response = await aiService.generateContent(
        `As a medical assistant, analyze these symptoms: "${symptoms}". 
        Patient details: Age: ${age}, Sex: ${sex}.
        Predict the most likely disease and provide a confidence score (0-1).
        Determine if the condition is "normal" (minor/common) or "serious" (requires professional attention).
        If "normal", suggest 2-3 common over-the-counter medicines.
        If "serious", specify the medical department/specialty needed (e.g., Cardiology, Neurology, General Medicine).
        Also provide 3 key pieces of advice.
        Return ONLY a JSON object with this structure:
        { 
          "disease": "string", 
          "confidence": number, 
          "severity": "normal" | "serious",
          "medicines": ["string"] | null,
          "department": "string" | null,
          "advice": ["string"] 
        }`,
        {
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          responseSchema: {
            type: "OBJECT",
            properties: {
              disease: { type: "STRING" },
              confidence: { type: "NUMBER" },
              severity: { type: "STRING", enum: ["normal", "serious"] },
              medicines: { type: "ARRAY", items: { type: "STRING" } },
              department: { type: "STRING" },
              advice: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["disease", "confidence", "severity", "advice"]
          }
        },
        provider
      );

      const text = response.text || '{}';
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(jsonStr);
      setResult(data);

      // If serious, fetch relevant doctors
      if (data.severity === 'serious' && data.department) {
        const doctorsRes = await fetch(`/api/doctors?department=${encodeURIComponent(data.department)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let docs = await doctorsRes.json();
        
        // If no specific department found, get general medicine or any
        if (docs.length === 0) {
          const allRes = await fetch('/api/doctors', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          docs = (await allRes.json()).slice(0, 3);
        }
        
        setSuggestedDoctors(docs);
      }

      // Save to history
      try {
        await fetch('/api/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            symptoms,
            result: data.disease,
            confidence: data.confidence,
            type: 'symptom'
          })
        });
      } catch (err) {
        console.error("Failed to save prediction history:", err);
      }

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("GEMINI_API_KEY")) {
        setError(err.message);
      } else {
        setError(`AI Error: ${err.message || "Failed to analyze symptoms. Please try again."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 p-4">
      <header className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">AI Symptom Checker</h1>
        <p className="text-xs sm:text-sm text-white/40 max-w-lg mx-auto">
          Enter your symptoms below for a preliminary AI-driven health analysis.
        </p>
      </header>

      <div className="glass-card p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Age</label>
            <div className="relative">
              <input
                type="number"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  localStorage.setItem('symptom_age', e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:border-[#00d2ff]/50"
                placeholder="Age"
                min="0"
                max="150"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Sex</label>
            <div className="relative">
              <input
                list="sex-options"
                value={sex}
                onChange={(e) => {
                  setSex(e.target.value);
                  localStorage.setItem('symptom_sex', e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:border-[#00d2ff]/50"
                placeholder="Enter Sex"
              />
              <datalist id="sex-options">
                <option value="Male" />
                <option value="Female" />
                <option value="Other" />
              </datalist>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider">What are you feeling?</label>
          <div className="relative">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pt-12 min-h-[150px] focus:outline-none focus:border-[#00d2ff]/50 transition-all text-lg resize-none custom-scrollbar"
              placeholder="e.g., I have a persistent headache and feel nauseous since morning..."
            />
            <Search className="absolute left-6 top-6 w-5 h-5 text-white/20" />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploadingPrescription}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all flex items-center justify-center shadow-xl disabled:opacity-50"
            title="Upload Prescription"
          >
            {uploadingPrescription ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#00d2ff]" />
            ) : (
              <Plus className="w-6 h-6 text-[#00d2ff]" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePrescriptionUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handlePredict}
            disabled={loading || !symptoms.trim()}
            className="flex-1 bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#00d2ff]/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Analyzing Symptoms...
              </>
            ) : (
              <>
                <Stethoscope className="w-6 h-6" />
                Predict Disease
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card overflow-hidden"
          >
            <div className="bg-[#00d2ff]/10 p-4 sm:p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-[10px] sm:text-xs font-bold text-[#00d2ff] uppercase tracking-widest">Predicted Condition</p>
                <h2 className="text-2xl sm:text-4xl font-bold">{result.disease}</h2>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Confidence Score</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 sm:w-32 h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(result.confidence || 0) * 100}%` }}
                      className="h-full bg-[#00d2ff]"
                    />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold">{((result.confidence || 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Recommended Next Steps
                  </h3>
                  <div className="space-y-3">
                    {result.advice.map((item: string, i: number) => (
                      <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white/70 leading-relaxed">
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#00d2ff]/60 italic mt-2">
                    Note: Not a formal medical diagnosis. Please consult a professional.
                  </p>
                </div>

                {result.severity === 'normal' && result.medicines && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Pill className="w-5 h-5 text-blue-500" />
                      Suggested Medicines
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {result.medicines.map((med: string, i: number) => (
                        <div key={i} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="font-medium text-blue-100">{med}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.severity === 'serious' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-[#00d2ff]">
                      <AlertCircle className="w-5 h-5" />
                      Requires Professional Attention
                    </h3>
                    <p className="text-sm text-white/60">
                      Based on your symptoms, we recommend consulting a specialist in <strong>{result.department}</strong>.
                    </p>
                    <div className="space-y-4">
                      {suggestedDoctors.map((doc) => (
                        <div key={doc.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold">{doc.name}</h4>
                              <p className="text-xs text-white/40">{doc.department} • {doc.experience} Experience</p>
                            </div>
                            <Stethoscope className="w-5 h-5 text-[#00d2ff]" />
                          </div>
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] font-bold text-white/20 uppercase mb-2">Availability</p>
                            <div className="flex flex-wrap gap-2">
                              {doc.availability.map((avail, idx) => (
                                <div key={idx} className="px-2 py-1 bg-white/5 rounded text-[10px]">
                                  <span className="font-bold">{avail.day}:</span> {avail.slots.join(', ')}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-white/10 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-lg font-semibold">Need to visit a medical facility?</h3>
                    <p className="text-sm text-white/40">Find the nearest hospitals and clinics around you.</p>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/hospitals+near+me`, '_blank')}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-bold"
                  >
                    <MapPin className="w-5 h-5 text-red-500" />
                    Find Nearest Medical
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
