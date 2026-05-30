import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import SearchPage from './views/SearchPage';
import HistoryPage from './views/HistoryPage';
import HelpPage from './views/HelpPage';
import UploadSection from './views/UploadSection';
import PremiumLoader from './components/PremiumLoader';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Search, History, HelpCircle, UploadCloud, Sun, Moon } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
  const [activeTab, setActiveTab] = useState('search');
  const [defaultQuery, setDefaultQuery] = useState('');
  const [appLoading, setAppLoading] = useState(true);
  const { darkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectSearch = (query) => {
    setDefaultQuery(query);
    setActiveTab('search');
  };

  const navItems = [
    { id: 'search', label: 'Qidirish', icon: Search, color: 'text-blue-500' },
    { id: 'history', label: 'Tarix', icon: History, color: 'text-purple-500' },
    { id: 'help', label: 'Yordam', icon: HelpCircle, color: 'text-orange-500' },
    { id: 'upload', label: 'Yuklash', icon: UploadCloud, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 transition-colors duration-300 text-slate-800 dark:text-slate-100">
      <AnimatePresence>
        {appLoading && <PremiumLoader />}
      </AnimatePresence>
      
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col justify-between w-64 glass-effect border-r border-slate-200/40 dark:border-slate-800/40 p-5 sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-royal flex items-center justify-center text-white soft-shadow">
              <Search size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                SAMDAQU
              </h1>
              <p className="text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: '9px', fontWeight: 400 }}>
                Creator : Shohjahon Shahriyev
              </p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-royal text-white soft-shadow scale-102' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : item.color} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/40 space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all"
          >
            <span className="flex items-center gap-3">
              {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600" />}
              {darkMode ? "Yorug' rejim" : "Qorong'u rejim"}
            </span>
          </button>
          
          <div className="px-4 text-xxxxs text-slate-400 dark:text-slate-500 text-center font-medium uppercase tracking-wider">
            v1.0.0 • Axmedov Dev
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar (Hidden on desktop) */}
      <div className="block md:hidden w-full">
        <Navbar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <SearchPage 
              key="search" 
              defaultQuery={defaultQuery} 
              onClearDefaultQuery={() => setDefaultQuery('')}
            />
          )}
          {activeTab === 'history' && (
            <HistoryPage 
              key="history" 
              onSelectSearch={handleSelectSearch}
            />
          )}
          {activeTab === 'help' && (
            <HelpPage key="help" />
          )}
          {activeTab === 'upload' && (
            <UploadSection key="upload" />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Sticky Bottom Navigation (Hidden on desktop) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
