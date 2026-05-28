import React from 'react';
import { Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md px-4 py-3 md:py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Logo and Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white soft-shadow overflow-hidden bg-white">
            <img src={logo} alt="SamDAQU Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
              SAMDAQU
            </h1>
            <p className="text-xxs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              CEO Shohjahon Shahriyev
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all duration-200"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

      </div>
    </header>
  );
}
