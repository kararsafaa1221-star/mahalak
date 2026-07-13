import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AboutUsContent } from '@shared/components/AboutUsContent';
import { WelcomeScreenBackground } from '@shared/components/WelcomeScreenBackground';

export const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-deep-navy text-white relative overflow-hidden" dir="rtl">
      <WelcomeScreenBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10 pb-16">
        <AboutUsContent />

        <div className="mt-10 text-center animate-fade-in">
          <Link
            to="/"
            className="welcome-btn-pulse inline-flex items-center gap-2 px-6 py-3 bg-brand-horizontal border border-white/30 text-white font-black text-sm rounded-2xl shadow-brand-glow transition-all hover:opacity-95 active:scale-95"
          >
            <ChevronRight size={18} />
            العودة للتطبيق
          </Link>
        </div>
      </div>
    </div>
  );
};
