import React, { useEffect, useState } from 'react';
import { History, Calendar, Check, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function HistoryPage({ onSelectSearch }) {
  const [localHistory, setLocalHistory] = useState([]);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  useEffect(() => {
    // Load local search history from localStorage
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setLocalHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // Load global search logs from backend stats
    fetchGlobalHistory();
  }, []);

  const fetchGlobalHistory = async () => {
    try {
      setLoadingGlobal(true);
      const res = await axios.get('http://localhost:5000/api/stats');
      if (res.data && res.data.stats && res.data.stats.lastSearches) {
        setGlobalHistory(res.data.stats.lastSearches);
      }
    } catch (err) {
      console.error('Error fetching global history:', err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const clearLocalHistory = () => {
    localStorage.removeItem('search_history');
    setLocalHistory([]);
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
             date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-purple flex items-center justify-center text-white soft-shadow">
          <History size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Qidiruv Tarixi
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Siz qidirgan va oxirgi qidirilgan ID raqamlar ro'yxati
          </p>
        </div>
      </div>

      {/* Local History Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            Mening qidiruvlarim
            <span className="text-xxs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
              {localHistory.length}
            </span>
          </h3>
          {localHistory.length > 0 && (
            <button
              onClick={clearLocalHistory}
              className="text-xxs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Tozalash
            </button>
          )}
        </div>

        {localHistory.length === 0 ? (
          <div className="glass-effect rounded-2xl p-6 text-center text-xs text-slate-400 dark:text-slate-500 soft-shadow">
            Siz hali biror marta ID qidirmadingiz.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {localHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSearch(item.query)}
                className="glass-effect rounded-2xl p-3.5 text-left soft-shadow hover:border-purple-500/30 transition-all duration-300 flex items-center justify-between group border border-slate-200/20"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    ID: {item.query}
                  </p>
                  <p className="text-xxs text-slate-400 dark:text-slate-500 mt-0.5">
                    {formatTime(item.timestamp)}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-purple-500 transition-all duration-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global History (Recent queries) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tizimdagi oxirgi qidiruvlar
          </h3>
          <button 
            onClick={fetchGlobalHistory}
            className="text-xxs text-blue-500 hover:text-blue-600 font-semibold transition-colors"
          >
            Yangilash
          </button>
        </div>

        {loadingGlobal ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl skeleton-wave" />
            ))}
          </div>
        ) : globalHistory.length === 0 ? (
          <div className="glass-effect rounded-2xl p-6 text-center text-xs text-slate-400 dark:text-slate-500 soft-shadow">
            Tizimda qidiruvlar tarixi mavjud emas.
          </div>
        ) : (
          <div className="space-y-2.5">
            {globalHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSearch(item.query)}
                className="w-full glass-effect rounded-2xl p-3.5 text-left soft-shadow hover:border-blue-500/30 transition-all duration-300 flex items-center justify-between group border border-slate-200/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    item.foundCount > 0 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {item.foundCount > 0 ? <Check size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      ID: {item.query}
                    </p>
                    <p className="text-xxs text-slate-400 dark:text-slate-500">
                      {item.foundCount > 0 ? `${item.foundCount} ta ma'lumot topildi` : "Ma'lumot topilmadi"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xxs text-slate-400 dark:text-slate-500">
                    {formatTime(item.timestamp)}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-blue-500 transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
