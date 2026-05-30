import React from 'react';
import { Search, History, HelpCircle, UploadCloud } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'search', label: 'Qidirish', icon: Search },
    { id: 'history', label: 'Tarix', icon: History },
    { id: 'help', label: 'Yordam', icon: HelpCircle },
    { id: 'upload', label: 'Yuklash', icon: UploadCloud },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/40 dark:border-slate-800/40 px-4 py-2 md:hidden bottom-nav-hide">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-300 relative group"
            >
              <div 
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-royal text-white scale-110 soft-shadow' 
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                }`}
              >
                <Icon size={20} className="stroke-[2]" />
              </div>
              <span 
                className={`text-xxs mt-1 font-semibold transition-colors duration-300 ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.label}
              </span>
              
              {/* Active Indicator dot */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
