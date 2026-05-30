import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ResultsSection from '../components/ResultsSection';
import { useToast } from '../context/ToastContext';

export default function SearchPage({ defaultQuery, onClearDefaultQuery }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchedId, setSearchedId] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const toast = useToast();

  useEffect(() => {
    // Sync recent searches from localStorage
    loadRecentSearches();
  }, []);

  useEffect(() => {
    // If a query is passed from parent (e.g. from history click)
    if (defaultQuery) {
      setQuery(defaultQuery);
      handleSearch(null, defaultQuery);
      onClearDefaultQuery(); // Clear it so it doesn't trigger again
    }
  }, [defaultQuery]);

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 3)); // show top 3
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const searchId = (overrideQuery || query).trim();

    if (!searchId) {
      toast.showError("ID raqamini kiriting!");
      return;
    }

    try {
      setLoading(true);
      setResults(null);
      setSearchedId(searchId);

      const res = await axios.post('/api/search', { id: searchId });
      setResults(res.data);

      if (res.data.length > 0) {
        toast.showSuccess(`Muvaffaqiyatli: ${res.data.length} ta imtihon topildi!`);
        // Add to local history
        saveToLocalHistory(searchId);
      } else {
        toast.showInfo("Ushbu ID ga tegishli imtihon topilmadi");
      }
    } catch (err) {
      console.error(err);
      toast.showError(err.response?.data?.error || "Qidiruvda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalHistory = (id) => {
    let history = [];
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch (e) {}
    }

    // Filter out existing duplicates
    history = history.filter(item => item.query !== id);
    // Add to top
    history.unshift({
      query: id,
      timestamp: new Date().toISOString()
    });
    // Limit to 20
    history = history.slice(0, 20);

    localStorage.setItem('search_history', JSON.stringify(history));
    loadRecentSearches();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8"
    >
      {/* Hero Section */}
      <div className="text-center my-6 md:my-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xxs font-bold uppercase tracking-wider mb-4 animate-pulse">
          <Sparkles size={12} />
          Imtihon Ma'lumotlari Dashboardi
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
          ID raqam orqali qidirish
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-md mx-auto">
          Imtihon vaqti, auditoriyasi hamda boshqa ma'lumotlarni bilib olish uchun talaba ID raqamini kiriting.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="w-full max-w-xl mx-auto mb-6">
        <div className="relative flex items-center">
          <div className="absolute left-4.5 text-slate-400 dark:text-slate-500">
            <Search size={20} className="stroke-[2.5]" />
          </div>
          <input
            type="text"
            placeholder="Masalan: 643129"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-12 pr-32 py-4 rounded-3xl glass-effect text-slate-800 dark:text-slate-100 font-bold placeholder-slate-400 border border-slate-200/50 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-300 text-base soft-shadow"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 px-6 py-2.5 rounded-2xl bg-gradient-royal text-white text-xs font-bold hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-1.5 soft-shadow"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Qidirish"
            )}
          </button>
        </div>
      </form>

      {/* Quick Search Helpers (Recent Searches) */}
      {recentSearches.length > 0 && !results && !loading && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-xl mx-auto">
          <span className="text-xxs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Star size={11} />
            Yaqindagilar:
          </span>
          {recentSearches.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(item.query);
                handleSearch(null, item.query);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-xxs font-semibold transition-all active:scale-95"
            >
              {item.query}
            </button>
          ))}
        </div>
      )}

      {/* Results or Loading Skeleton */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Table or Cards Skeleton */}
            <div className="hidden md:block w-full h-[180px] rounded-3xl skeleton-wave" />
            <div className="block md:hidden space-y-4">
              <div className="w-full h-[140px] rounded-3xl skeleton-wave" />
              <div className="w-full h-[140px] rounded-3xl skeleton-wave" />
            </div>
          </motion.div>
        ) : results ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {results.length > 0 ? (
              <ResultsSection results={results} searchedId={searchedId} />
            ) : (
              // Topilmadi State UI
              <div className="glass-effect rounded-3xl p-8 text-center soft-shadow max-w-md mx-auto border border-slate-200/20 mt-8">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ma'lumot topilmadi
                </h4>
                <p className="text-xxs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                  ID: <span className="font-bold text-rose-500">{searchedId}</span> ga tegishli hech qanday imtihon jadvali topilmadi.
                  Iltimos, ID raqamni to'g'ri kiritganingizni tekshiring yoki yuklangan Excel ma'lumotlar bazasini yangilang.
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

    </motion.div>
  );
}
