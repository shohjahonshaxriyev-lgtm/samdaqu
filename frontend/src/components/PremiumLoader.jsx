import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';


export default function PremiumLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      {/* Main Loader Core */}
      <div className="relative flex flex-col items-center">
        
        {/* Animated Double-ring Spinner */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-slate-800 border-t-2 border-t-blue-500"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute -inset-2.5 rounded-full border border-slate-800/40 border-b-blue-600/60"
          />
          
          {/* Logo Icon inside circle */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white soft-shadow overflow-hidden bg-white"
          >
            <img src="/logo.png" alt="SamDAQU Logo" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        {/* Loading text messages */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-8"
        >
          <h2 className="text-xl font-bold tracking-tight text-white">
            SAMDAQU
          </h2>
          <p className="text-slate-500 uppercase tracking-[0.15em] mt-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: '9px', fontWeight: 400 }}>
            Creator : Shohjahon Shahriyev
          </p>
        </motion.div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 mt-10">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
        </div>
      </div>
    </motion.div>
  );
}
