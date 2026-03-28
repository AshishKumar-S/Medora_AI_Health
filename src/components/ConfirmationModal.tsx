import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
    info: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20',
    warning: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#151619] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
        >
          {/* Background Glow */}
          <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${type === 'danger' ? 'bg-red-500' : type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'}`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${type === 'danger' ? 'bg-red-500/10 text-red-500' : type === 'info' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button 
                onClick={onCancel}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{title}</h3>
            <p className="text-white/60 leading-relaxed mb-8">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-6 py-3 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg ${colors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
