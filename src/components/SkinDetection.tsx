import React, { useState, useRef } from 'react';
import { Scan, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, Pill } from 'lucide-react';
import { UserProfile } from '../types';
import { aiService, AIProvider } from '../lib/ai-service';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function SkinDetection({ user }: { user: UserProfile }) {
  const { token } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setLoading(true);
    setError('');
    const base64Data = image.split(',')[1];

    try {
      const response = await aiService.generateContent(
        [
          { text: `Analyze this skin image as a professional medical assistant. 
            1. Describe the visual characteristics of the skin (e.g., redness, texture, bumps).
            2. Identify the most likely condition (e.g., Acne, Eczema, Psoriasis, Ringworm, etc.).
            3. Provide a confidence score (0-1) based on visual evidence.
            4. Give 3 pieces of practical advice for care.
            5. Suggest 1-2 common over-the-counter (OTC) medicines, creams, or ointments that are generally safe for this condition. 
            6. If the condition appears serious or contagious, strongly recommend consulting a dermatologist.
            Return ONLY a JSON object: { "condition": "string", "confidence": number, "advice": ["string", "string", "string"], "medicines": ["string"] }
            Ensure the response is a valid JSON object and medically accurate for an assistant.` 
          },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ],
        {
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          responseSchema: {
            type: "OBJECT",
            properties: {
              condition: { type: "STRING" },
              confidence: { type: "NUMBER" },
              advice: { type: "ARRAY", items: { type: "STRING" } },
              medicines: { type: "ARRAY", items: { type: "STRING" }, description: "Suggested OTC medicines or specialist recommendation" }
            },
            required: ["condition", "confidence", "advice", "medicines"]
          }
        },
        provider
      );

      const text = response.text || '{}';
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(jsonStr);
      setResult(data);

      // Save to history
      try {
        await fetch('/api/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            result: data.condition,
            confidence: data.confidence,
            type: 'skin'
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
        setError(`AI Error: ${err.message || "Failed to analyze image. Please ensure the image is clear and try again."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 p-4">
      <header className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Skin Condition Detection</h1>
        <p className="text-xs sm:text-sm text-white/40 max-w-lg mx-auto">
          Upload a clear photo of the affected skin area for an AI-powered analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Upload Section */}
        <div className="glass-card p-4 sm:p-8 flex flex-col items-center justify-center space-y-6 min-h-[350px] sm:min-h-[450px]">
          {image ? (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/10 group">
              <img src={image} alt="Skin area" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all text-white"
                  title="Upload New"
                >
                  <Upload className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square flex flex-col gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group"
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-all">
                  <Upload className="w-6 h-6 text-white/40" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Upload image</p>
                </div>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            className="w-full bg-[#00d2ff] hover:bg-[#00d2ff]/80 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#00d2ff]/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Analyzing Image...
              </>
            ) : (
              <>
                <Scan className="w-6 h-6" />
                Analyze Condition
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-4 sm:p-8 space-y-8"
              >
                <div className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-bold text-[#00d2ff] uppercase tracking-widest">Analysis Result</p>
                  <h2 className="text-2xl sm:text-3xl font-bold">{result.condition}</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.confidence || 0) * 100}%` }}
                        className="h-full bg-[#00d2ff]"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">{((result.confidence || 0) * 100).toFixed(0)}% Match</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Recommendations</h3>
                  <div className="space-y-3">
                    {result.advice.map((item: string, i: number) => (
                      <div key={i} className="flex gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-white/70 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.medicines && result.medicines.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Suggested Care</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {result.medicines.map((med: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded-xl">
                          <Pill className="w-4 h-4 text-[#00d2ff]" />
                          <span className="text-sm font-medium text-[#00d2ff]/80">{med}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-300/80 leading-relaxed">
                  Disclaimer: AI analysis for informational purposes; not a replacement for professional medical consultation. If condition persists or worsens, consult a dermatologist immediately.
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-white/20" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Ready for Analysis</h3>
                  <p className="text-sm text-white/40 mt-2">Upload an image and click analyze to see results here.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
