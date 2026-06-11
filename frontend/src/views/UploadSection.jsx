import React, { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, RefreshCw, BarChart2, CheckCircle2, TrendingUp, Search, Lock, Unlock, KeyRound, Eye, EyeOff, Trash2, Columns3, Table2, RotateCcw } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
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
  const [settings, setSettings] = useState({ sponsorChannel: '' });
  const [newChannel, setNewChannel] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [mappingSaving, setMappingSaving] = useState(false);
  const toast = useToast();

  // System field definitions for column mapping UI
  const SYSTEM_FIELDS = [
    { key: 'id', label: 'Talaba ID', icon: '🆔' },
    { key: 'sana', label: 'Sana', icon: '📅' },
    { key: 'day_name', label: 'Hafta kuni', icon: '📆' },
    { key: 'start_time', label: 'Boshlanish vaqti', icon: '🕐' },
    { key: 'end_time', label: 'Tugash vaqti', icon: '🕑' },
    { key: 'exam_code', label: 'Fan kodi', icon: '🔢' },
    { key: 'exam_name', label: 'Fan nomi', icon: '📚' },
    { key: 'auditorya', label: 'Auditoriya (xona)', icon: '🏫' },
    { key: 'student_name', label: 'Talaba ismi', icon: '👤' },
    { key: 'student_surname', label: 'Talaba familiyasi', icon: '👥' },
    { key: 'student_fullname', label: 'Talaba F.I.O', icon: '📋' },
    { key: 'stul_raqami', label: 'Stul raqami', icon: '💺' },
  ];

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
      if (res.data.sponsorChannel && res.data.sponsorChannel !== '0') {
        setNewChannel(res.data.sponsorChannel);
      } else {
        setNewChannel('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateChannel = async (channel) => {
    try {
      await axios.post('/api/settings', { sponsorChannel: channel });
      fetchSettings();
      if (channel === '0') {
        toast.showSuccess("Kanal o'chirildi!");
      } else {
        toast.showSuccess("Kanal saqlandi!");
      }
    } catch (err) {
      toast.showError("Xatolik yuz berdi");
    }
  };

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
      fetchSettings();
      fetchColumnMapping();
      fetchExcelHeaders();
    }
  }, [isUnlocked]);

  const fetchColumnMapping = async () => {
    try {
      const res = await axios.get('/api/column-mapping');
      setColumnMapping(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExcelHeaders = async () => {
    try {
      const res = await axios.get('/api/excel-headers');
      setExcelHeaders(res.data.headers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMappingChange = (key, value) => {
    setColumnMapping(prev => ({ ...prev, [key]: value }));
  };

  const saveColumnMapping = async () => {
    try {
      setMappingSaving(true);
      await axios.post('/api/column-mapping', columnMapping);
      toast.showSuccess("Ustun sozlamalari saqlandi!");
      fetchExcelHeaders();
    } catch (err) {
      toast.showError("Saqlashda xatolik yuz berdi");
    } finally {
      setMappingSaving(false);
    }
  };

  const clearColumnMapping = async () => {
    try {
      setMappingSaving(true);
      await axios.post('/api/column-mapping', {});
      setColumnMapping({});
      toast.showSuccess("Ustun sozlamalari tozalandi! Avtomatik rejim yoqildi.");
    } catch (err) {
      toast.showError("Tozalashda xatolik yuz berdi");
    } finally {
      setMappingSaving(false);
    }
  };

  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (passcode.trim() === 'shohjahon2@@5') {
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
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.showError("Faqat .xlsx yoki .xls formatidagi Excel fayllarini yuklang!");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.showError("Fayl hajmi 5 MB dan katta bo'lishi mumkin emas");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      setUploading(true);
      setUploadProgress(0);
      const res = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });
      toast.showSuccess(res.data.message || "Fayl yuklandi!");
      setFile(null);
      setUploadProgress(0);
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.showError(err.response?.data?.error || "Faylni yuklashda xatolik yuz berdi");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = async () => {
    if (window.confirm("Rostdan ham joriy Excel faylni o'chirib tashlamoqchimisiz? Barcha imtihon jadvallari o'chib ketadi!")) {
      try {
        const res = await axios.delete('/api/upload');
        toast.showSuccess(res.data.message || "Fayl o'chirildi!");
        fetchStats();
      } catch (err) {
        toast.showError(err.response?.data?.error || "O'chirishda xatolik yuz berdi");
      }
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
        <div className="glass-effect rounded-3xl p-5 soft-shadow flex items-center gap-4 border border-slate-200/20 relative">
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
          {stats.activeFile && (
            <button
              onClick={handleDeleteFile}
              className="absolute top-4 right-4 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all active:scale-95"
              title="Faylni o'chirish"
            >
              <Trash2 size={16} />
            </button>
          )}
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
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] mx-auto">
                      {file.name}
                    </p>
                    <p className="text-xxs text-slate-400 dark:text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mt-2 mb-2">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
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

      {/* Sponsor Channel Card */}
      <div className="glass-effect rounded-3xl p-5 soft-shadow border border-slate-200/20 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Homiy kanalni boshqarish
            </h3>
            <p className="text-xxs text-slate-400 dark:text-slate-500">
              Botdan foydalanish uchun majburiy obuna kanali (Bot shu kanalda admin bo'lishi shart!)
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            placeholder="@kanal_nomi yoki to'liq link"
            className="flex-1 w-full px-4 py-3 rounded-2xl glass-effect text-slate-800 dark:text-slate-100 font-bold placeholder-slate-400 border border-slate-200/50 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-xs"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => updateChannel(newChannel)}
              disabled={!newChannel || newChannel.trim() === ''}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-royal text-white text-xs font-bold hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              Saqlash
            </button>
            <button
              onClick={() => { setNewChannel(''); updateChannel('0'); }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              O'chirish
            </button>
          </div>
        </div>
        
        {settings.sponsorChannel && settings.sponsorChannel !== '0' && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between border border-indigo-100 dark:border-indigo-500/20">
            <span>Joriy kanal: {settings.sponsorChannel}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Column Mapping Card */}
      <div className="glass-effect rounded-3xl p-5 soft-shadow border border-slate-200/20 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Columns3 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Ustunlarni sozlash
              </h3>
              <p className="text-xxs text-slate-400 dark:text-slate-500">
                Excel fayldagi ustun nomlarini tizim maydonlariga moslashtiring
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearColumnMapping}
              disabled={mappingSaving || Object.keys(columnMapping).length === 0}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-40"
              title="Tozalash (avtomatik rejim)"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={saveColumnMapping}
              disabled={mappingSaving}
              className="px-4 py-2 rounded-xl bg-gradient-royal text-white text-xs font-bold hover:opacity-95 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              {mappingSaving ? (
                <><RefreshCw size={13} className="animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><CheckCircle2 size={13} /> Saqlash</>
              )}
            </button>
          </div>
        </div>

        {/* Excel headers hint */}
        {excelHeaders.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-500/15">
            <p className="text-xxs font-semibold text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1.5">
              <Table2 size={13} />
              Excel fayldagi ustunlar:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {excelHeaders.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-xxxxs font-bold text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50 cursor-default"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {excelHeaders.length === 0 && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 text-center">
            <p className="text-xxs text-amber-600 dark:text-amber-400 font-semibold">
              ⚠️ Avval Excel fayl yuklang, so'ng ustunlarni sozlashingiz mumkin.
            </p>
          </div>
        )}

        {/* Mapping fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SYSTEM_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/50">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-sm shrink-0 border border-slate-100 dark:border-slate-700">
                {field.icon}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xxxxs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list={`headers-list-${field.key}`}
                    value={columnMapping[field.key] || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    placeholder={`Excel ustun nomi...`}
                    className="w-full px-3 py-2 rounded-lg glass-effect text-slate-800 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 border border-slate-200/50 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-xxs"
                  />
                  <datalist id={`headers-list-${field.key}`}>
                    {excelHeaders.map((h, i) => (
                      <option key={i} value={h} />
                    ))}
                  </datalist>
                </div>
              </div>
              {columnMapping[field.key] && (
                <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 animate-pulse" title="Sozlangan" />
              )}
            </div>
          ))}
        </div>

        {/* Active mappings summary */}
        {Object.keys(columnMapping).filter(k => columnMapping[k]).length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-500/20">
            <p className="text-xxs font-semibold text-teal-700 dark:text-teal-300 mb-1">
              ✅ {Object.keys(columnMapping).filter(k => columnMapping[k]).length} ta maydon sozlangan
            </p>
            <p className="text-xxxxs text-teal-600/70 dark:text-teal-400/60">
              Sozlanmagan maydonlar avtomatik aniqlanadi.
            </p>
          </div>
        )}
      </div>

      {/* Sound Preview Card */}
      <div className="glass-effect rounded-3xl p-5 soft-shadow border border-slate-200/20 mt-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
          🎵 Muvaffaqiyat ovozini sinab ko'ring
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.setValueAtTime(440, ctx.currentTime);
            o.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
            o.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.3);
            g.gain.setValueAtTime(0.3, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            o.start(); o.stop(ctx.currentTime + 0.5);
          }} className="py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs hover:bg-blue-100 transition">
            1. Chime
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (f, t) => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.type = 'sine'; o.frequency.value = f;
              g.gain.setValueAtTime(0.3, ctx.currentTime + t);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
              o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
            };
            playNote(523.25, 0); playNote(659.25, 0.1); playNote(783.99, 0.2); playNote(1046.50, 0.3);
          }} className="py-3 px-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold text-xs hover:bg-purple-100 transition">
            2. Magic
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (t) => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.type = 'sine'; o.frequency.value = 880;
              g.gain.setValueAtTime(0.3, ctx.currentTime + t);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
              o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
            };
            playNote(0); playNote(0.2);
          }} className="py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-100 transition">
            3. Bell
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'square';
            o.frequency.setValueAtTime(987, ctx.currentTime);
            o.frequency.setValueAtTime(1318, ctx.currentTime + 0.1);
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            o.start(); o.stop(ctx.currentTime + 0.4);
          }} className="py-3 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-xs hover:bg-amber-100 transition">
            4. Coin
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle'; o.frequency.setValueAtTime(600, ctx.currentTime);
            g.gain.setValueAtTime(0.5, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            o.start(); o.stop(ctx.currentTime + 0.2);
          }} className="py-3 px-4 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-xl font-bold text-xs hover:bg-cyan-100 transition">
            5. Pluck
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [523.25, 659.25, 783.99].forEach(f => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.type = 'sine'; o.frequency.value = f;
              g.gain.setValueAtTime(0.15, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
              o.start(); o.stop(ctx.currentTime + 0.6);
            });
          }} className="py-3 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs hover:bg-rose-100 transition">
            6. Chord
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'square'; 
            o.frequency.setValueAtTime(300, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            o.start(); o.stop(ctx.currentTime + 0.3);
          }} className="py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 transition">
            7. Level Up
          </button>

          <button onClick={() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (f, t) => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.type = 'triangle'; o.frequency.value = f;
              g.gain.setValueAtTime(0.2, ctx.currentTime + t);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.1);
              o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.1);
            };
            playNote(880, 0); playNote(1108.73, 0.05); playNote(1318.51, 0.1); playNote(1760, 0.15); playNote(2217.46, 0.2);
          }} className="py-3 px-4 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-xl font-bold text-xs hover:bg-pink-100 transition">
            8. Sparkle
          </button>
        </div>
      </div>
    </motion.div>
  );
}
