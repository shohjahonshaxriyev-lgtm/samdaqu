import React, { useState } from 'react';
import { ChevronDown, HelpCircle, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: "Tizimdan qanday foydalaniladi?",
      answer: "Qidirish sahifasida o'zingizning talaba ID raqamingizni kiritasiz (masalan, 643129) va 'Qidirish' tugmasini bosasiz. Tizim yuklangan Excel faylidan ushbu ID bo'yicha barcha imtihon jadvallarini topib beradi."
    },
    {
      question: "Qaysi Excel ustunlari moslashuvchan (fuzzy) aniqlanadi?",
      answer: "Tizim quyidagi ma'lumotlarni o'z ichiga olgan ustunlarni avtomatik qidirib topadi:\n- ID (Student ID, Kod, Identifikator, №)\n- Sana (Date, Kun)\n- Hafta kuni (day_name, day, hafta)\n- Boshlanish vaqti (start_time, boshlanish)\n- Tugash vaqti (end_time, tugash)\n- Fan kodi va nomi (exam_code, exam_name, fan)\n- Bino va Auditoriya (building, auditorya, bino, xona)\n- Talaba ismi va familiyasi (student_name, student_surname, ism, familiya)\n\nAgar Excelda boshqa ustunlar bo'lsa, ular ham 'Qo'shimcha ma'lumot' sifatida saqlanib, jadvalda ko'rinadi."
    },
    {
      question: "Yangi Excel faylini qanday yuklash mumkin?",
      answer: "Ekraningizdagi 'Yuklash' bo'limiga o'ting va yangi .xlsx yoki .xls formatidagi Excel faylingizni drag-and-drop qiling yoki tanlab yuklang. Yuklangan fayl avtomatik ravishda eski ma'lumotlar o'rnini egallaydi."
    },
    {
      question: "Imtihon ma'lumotlarini yuklab olish mumkinmi?",
      answer: "Ha! ID bo'yicha qidiruv natijalari chiqqandan keyin, jadvalning yuqori o'ng burchagidagi 'PDF Yuklab olish' tugmasi yordamida imtihon varaqasini chiroyli formatlangan PDF shaklida saqlab olishingiz mumkin."
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-royal flex items-center justify-center text-white soft-shadow">
          <HelpCircle size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Yordam Markazi
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Tizimdan foydalanish bo'yicha yo'riqnoma va savollarga javoblar
          </p>
        </div>
      </div>

      {/* Quick Tutorial Card */}
      <div className="glass-effect rounded-3xl p-5 mb-6 soft-shadow">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <FileText size={16} className="text-blue-600 dark:text-blue-400" />
          Tezkor Qo'llanma
        </h3>
        <ul className="space-y-3.5">
          <li className="flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xxs">1</span>
            ID raqamingizni kiriting va 'Qidirish' tugmasini bosing.
          </li>
          <li className="flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xxs">2</span>
            Jadvaldagi yoki imtihon kartasidagi ma'lumotlarni tekshiring.
          </li>
          <li className="flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xxs">3</span>
            Natijalarni 'PDF' tugmasi orqali yuklab oling.
          </li>
        </ul>
      </div>

      {/* Accordion FAQs */}
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300 mb-3">Ko'p beriladigan savollar</h3>
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openFaq === index;
          return (
            <div 
              key={index}
              className="glass-effect rounded-2xl overflow-hidden soft-shadow transition-all duration-300 border border-slate-200/20"
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                  }`} 
                />
              </button>
              
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100/50 dark:border-slate-800/50 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
