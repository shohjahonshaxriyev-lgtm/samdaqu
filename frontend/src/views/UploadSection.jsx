import React, { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, RefreshCw, BarChart2, CheckCircle2, TrendingUp, Search, Lock, Unlock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

export default function UploadSection() {
  const [isUnlocked, setIsUnlocked] = useState(() => localStorage.getItem('is_admin_unlocked') === 'true');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({
    activeFile: null,
    totalRows: 0,
    stats: {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      popularSearches: {}
    }
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const toast = useToast();

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      toast.showError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchStats();
    }
  }, [isUnlocked]);

  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (passcode.trim() === 'admin123') {
      setIsUnlocked(true);
      localStorage.setItem('is_admin_unlocked', 'true');
      toast.showSuccess("Yuklash bo'limi muvaffaqiyatli ochildi!");
    } else {
      toast.showError("Kirish kodi noto'g'ri!");
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    localStorage.removeItem('is_admin_unlocked');
    setPasscode('');
    toast.showInfo("Yuklash bo'limi qulflandi");
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      setFile(selectedFile);
    } else {
      toast.showError("Faqat .xlsx yoki .xls formatidagi Excel fayllarini yuklang!");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      setUploading(true);
      const res = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.showSuccess(res.data.message || "Fayl yuklandi!");
      setFile(null);
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.showError(err.response?.data?.error || "Faylni yuklashda xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  // Convert popularSearches to sorted array
  const popularList = Object.entries(stats.stats?.popularSearches || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const successRate = stats.stats?.totalSearches > 0 
    ? Math.round((stats.stats.successfulSearches / stats.stats.totalSearches) * 100)
    : 0;

  if (!isUnlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto px-4 py-16 pb-24 md:pb-12"
      >
        <div className="glass-effect rounded-3xl p-6 md:p-8 soft-shadow border border-slate-200/20 text-center relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
          
          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-6 soft-shadow relative">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <Lock size={28} className="stroke-[2]" />
          </div>

          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
            Yuklash bo'limi qulflangan
          </h2>
          <p className="text-xxs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
            Dastur ma'lumotlar bazasini o'zgartirish bo'limiga kirish uchun parolni kiriting.
          </p>

          <form onSubmit={handleUnlock} className="mt-8 space-y-4">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400">
                <KeyRound size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kirish kodini kiriting"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-2xl glass-effect text-slate-800 dark:text-slate-100 font-bold placeholder-slate-400 border border-slate-200/50 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-xs soft-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-royal text-white text-xs font-bold hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-1.5 soft-shadow"
            >
              <Unlock size={14} />
              Tizimga kirish
            </button>
          </form>

        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-green flex items-center justify-center text-white soft-shadow">
            <UploadCloud size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Fayl Yuklash va Statistika
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Excel ma'lumotlar bazasini almashtirish va foydalanish tahlili
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLock}
            className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all active:scale-95 soft-shadow flex items-center justify-center"
            title="Bo'limni qulflash"
          >
            <Lock size={18} />
          </button>
          <button
            onClick={fetchStats}
            disabled={loadingStats}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all active:scale-95"
          >
            <RefreshCw size={18} className={loadingStats ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Total records card */}
        <div className="glass-effect rounded-3xl p-5 soft-shadow flex items-center gap-4 border border-slate-200/20">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <p className="text-xxs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Jami ma'lumotlar
            </p>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {loadingStats ? "..." : `${stats.totalRows} qator`}
            </h4>
            <p className="text-xxxxs text-slate-400 dark:text-slate-500 truncate max-w-[150px] mt-0.5">
              {stats.activeFile || "Fayl topilmadi"}
            </p>
          </div>
        </div>

        {/* Total searches card */}
        <div className="glass-effect rounded-3xl p-5 soft-shadow flex items-center gap-4 border border-slate-200/20">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BarChart2 size={24} />
          </div>
          <div>
            <p className="text-xxs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Qidiruvlar soni
            </p>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {loadingStats ? "..." : `${stats.stats?.totalSearches} ta`}
            </h4>
            <p className="text-xxxxs text-slate-400 dark:text-slate-500 mt-0.5">
              Muvaffaqiyatli: {stats.stats?.successfulSearches || 0} ta
            </p>
          </div>
        </div>

        {/* Success rate card */}
        <div className="glass-effect rounded-3xl p-5 soft-shadow flex items-center gap-4 border border-slate-200/20">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xxs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Natija Ko'rsatkichi
            </p>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {loadingStats ? "..." : `${successRate}%`}
            </h4>
            <p className="text-xxxxs text-slate-400 dark:text-slate-500 mt-0.5">
              Topilmadi: {stats.stats?.failedSearches || 0} marta
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upload Card */}
        <div className="glass-effect rounded-3xl p-5 soft-shadow flex flex-col justify-between border border-slate-200/20">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Excel yuklash
            </h3>
            <p className="text-xxs text-slate-400 dark:text-slate-500 mb-4">
              Jadvalni yangilash uchun yangi Excel (.xlsx, .xls) faylini yuklang.
            </p>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 relative ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                  : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10'
              }`}
            >
              <input 
                type="file" 
                id="file-upload-input" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleChange}
              />
              
              <label 
                htmlFor="file-upload-input" 
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <UploadCloud size={22} />
                </div>
                {file ? (
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] mx-auto">
                      {file.name}
                    </p>
                    <p className="text-xxs text-slate-400 dark:text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Excel faylni sudrab tashlang yoki tanlang
                    </p>
                    <p className="text-xxs text-slate-400 dark:text-slate-500 mt-1">
                      Faqat .xlsx va .xls formatlari qo'llab-quvvatlanadi
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {file && (
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setFile(null)}
                className="flex-1 py-3 text-xs font-semibold rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-3 text-xs font-semibold rounded-2xl bg-gradient-royal text-white hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-1.5 soft-shadow"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Saqlash
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Search Analytics Card */}
        <div className="glass-effect rounded-3xl p-5 soft-shadow border border-slate-200/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
            <Search size={16} className="text-purple-500" />
            Eng mashhur qidiruvlar
          </h3>
          <p className="text-xxs text-slate-400 dark:text-slate-500 mb-4">
            Eng ko'p imtihon jadvali so'ralgan talaba ID raqamlari.
          </p>

          {loadingStats ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-xl skeleton-wave" />
              ))}
            </div>
          ) : popularList.length === 0 ? (
            <div className="h-[140px] flex items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500">
              Statistika mavjud emas.
            </div>
          ) : (
            <div className="space-y-2.5">
              {popularList.map(([query, count], idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100/50 dark:border-slate-800/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xxs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ID: {query}
                    </span>
                  </div>
                  <span className="text-xxs font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                    {count} marta
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
