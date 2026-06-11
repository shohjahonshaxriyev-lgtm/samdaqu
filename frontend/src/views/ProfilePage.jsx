import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Calendar, Clock, ChevronRight, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputId, setInputId] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const savedProfile = localStorage.getItem('sdtu_user_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      fetchExams(parsed.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchExams = async (id) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/search', { id });
      setExams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.showError("Ma'lumotlarni yangilashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!inputId.trim()) {
      toast.showError('Iltimos, ID raqamingizni kiriting');
      return;
    }
    
    setLoginLoading(true);
    try {
      const res = await axios.post('/api/search', { id: inputId.trim() });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const student = res.data[0];
        const newProfile = {
          id: inputId.trim(),
          firstName: student.student_name || student.student_fullname || '',
          lastName: student.student_surname || ''
        };
        localStorage.setItem('sdtu_user_profile', JSON.stringify(newProfile));
        setProfile(newProfile);
        setExams(res.data);
        toast.showSuccess('Profilga muvaffaqiyatli kirdingiz!');
      } else {
        toast.showError("Bu ID bo'yicha ma'lumot topilmadi!");
      }
    } catch (err) {
      toast.showError("Tizimda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdtu_user_profile');
    setProfile(null);
    setExams([]);
    setInputId('');
    toast.showSuccess('Tizimdan chiqdingiz');
  };

  // Login View
  if (!profile && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh]"
      >
        <div className="w-24 h-24 rounded-full bg-white soft-shadow flex items-center justify-center mb-6 overflow-hidden">
          <img src="/logo.jpg" alt="SDTU" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
          Shaxsiy Kabinet
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8 px-4">
          Tizimga kirish uchun o'zingizning ID raqamingizni kiriting.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="text-slate-400" size={20} />
            </div>
            <input
              type="number"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="ID raqamingiz (masalan: 643129)"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-effect border border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-royal text-white font-bold hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loginLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Tizimga kirish <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    );
  }

  // Loading View
  if (loading && !profile) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-400 to-teal-500',
    'from-purple-500 to-fuchsia-600',
    'from-orange-400 to-rose-500',
    'from-sky-400 to-blue-500'
  ];

  // Profile View
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto p-4 pb-24"
    >
      {/* Header Profile Card */}
      <div className="relative glass-effect rounded-3xl p-6 soft-shadow border border-slate-200/40 dark:border-slate-800/40 overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-royal opacity-20 dark:opacity-40"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-2">
          <div className="w-28 h-28 rounded-3xl bg-white soft-shadow border-4 border-white dark:border-slate-800 overflow-hidden shrink-0">
            <img src="/logo.jpg" alt="Profile" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 text-center sm:text-left mb-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              {profile?.lastName} {profile?.firstName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                Talaba ID: {profile?.id}
              </span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            title="Tizimdan chiqish"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Simplified Schedule View */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 px-2 flex items-center gap-2">
          <Calendar size={20} className="text-indigo-500" /> Imtihon kunlari
        </h3>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : exams.length === 0 ? (
          <div className="text-center p-8 glass-effect rounded-3xl border border-slate-200/40 dark:border-slate-800/40">
            <p className="text-slate-500 dark:text-slate-400">Hech qanday imtihon topilmadi.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {exams.map((exam, i) => {
              const bgGradient = colors[i % colors.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative overflow-hidden rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-slate-200/20 dark:shadow-none`}
                >
                  {/* Colored Background */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-[0.85] dark:opacity-80 mix-blend-multiply dark:mix-blend-normal`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col">
                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider mb-0.5">
                      {exam.sana} • {exam.day_name}
                    </span>
                    <span className={`text-white font-bold leading-tight line-clamp-2 ${(exam.exam_name || '').length > 30 ? 'text-sm' : 'text-lg'}`}>
                       {exam.exam_name || "Imtihon"}
                     </span>
                  </div>

                    <div className="relative z-10 flex flex-col items-end gap-1 bg-white/20 backdrop-blur-md px-3 py-2 rounded-xl text-white font-bold text-sm text-right min-w-[100px]">
                      <span className="text-white leading-tight">{exam.building || ''} {exam.auditorya || ''}</span>
                      <div className="flex items-center gap-1 text-white/80">
                        <Clock size={14} />
                        <span>{exam.start_time || '--:--'}</span>
                      </div>
                    </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </motion.div>
  );
}
