import React from 'react';
import { motion } from 'framer-motion';

export default function MagicLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="magic-loader-overlay"
    >
      <div className="magic-loader-content">
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="magic-particle"
            style={{
              '--delay': `${Math.random() * 2}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--size': `${3 + Math.random() * 6}px`,
              '--duration': `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}

        {/* Central magic orb */}
        <div className="magic-orb-container">
          <div className="magic-orb">
            <div className="magic-orb-inner" />
            <div className="magic-orb-ring magic-orb-ring-1" />
            <div className="magic-orb-ring magic-orb-ring-2" />
            <div className="magic-orb-ring magic-orb-ring-3" />
          </div>
        </div>

        {/* Searching text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="magic-loader-text"
        >
          <p className="magic-loader-title">Qidirilmoqda...</p>
          <div className="magic-loader-dots">
            <span className="magic-dot" style={{ animationDelay: '0s' }} />
            <span className="magic-dot" style={{ animationDelay: '0.2s' }} />
            <span className="magic-dot" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="magic-loader-subtitle">Ma'lumotlar bazasi tekshirilmoqda</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
