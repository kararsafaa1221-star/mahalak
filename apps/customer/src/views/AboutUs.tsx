import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AboutUsContent } from '@shared/components/AboutUsContent';

export const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-mahalak-gradient text-on-navy" dir="rtl">
      <div className="max-w-2xl mx-auto px-5 py-10 pb-16">
        <AboutUsContent />

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-vibrant-purple hover:bg-violet text-white font-black text-sm rounded-2xl transition"
          >
            <ChevronRight size={18} />
            العودة للتطبيق
          </Link>
        </div>
      </div>
    </div>
  );
};
