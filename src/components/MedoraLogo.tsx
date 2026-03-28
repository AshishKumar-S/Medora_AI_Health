import React from 'react';
import { Activity, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface MedoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function MedoraLogo({ className = '', size = 'md' }: MedoraLogoProps) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-32 h-32 sm:w-40 sm:h-40',
    xl: 'w-48 h-48'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative flex items-center justify-center ${sizes[size]} ${className}`}>
      {/* Outer Glow Ring */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] rounded-[30%] blur-2xl opacity-40"
      />
      
      {/* Main Container */}
      <div className="relative w-full h-full bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] rounded-[30%] flex items-center justify-center shadow-2xl shadow-[#00d2ff]/30 border border-white/20 overflow-hidden">
        {/* Animated Background Pulse */}
        <motion.div 
          animate={{ 
            x: ['-100%', '100%'],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
        
        {/* Shield Icon for Protection */}
        <Shield className={`absolute ${iconSizes[size]} text-white/10 scale-150`} />
        
        {/* Main Activity Icon */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          <Activity className={`${iconSizes[size]} text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />
        </motion.div>
      </div>
      
      {/* Floating Particles */}
      <motion.div 
        animate={{ 
          y: [-10, 10, -10],
          x: [-5, 5, -5]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full blur-[2px] opacity-60"
      />
      <motion.div 
        animate={{ 
          y: [10, -10, 10],
          x: [5, -5, 5]
        }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute -bottom-4 -left-2 w-4 h-4 bg-blue-400 rounded-full blur-[3px] opacity-40"
      />
    </div>
  );
}
