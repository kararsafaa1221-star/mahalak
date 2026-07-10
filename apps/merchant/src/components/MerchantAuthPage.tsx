import React from 'react';
import { MahalakLogo } from '@shared/components/MahalakLogo';

interface MerchantAuthPageProps {
  children: React.ReactNode;
}

export const MerchantAuthPage: React.FC<MerchantAuthPageProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-mahalak-gradient" dir="rtl">
      <main className="flex min-h-screen w-full flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        <MahalakLogo className="mx-auto mb-2 h-48 w-48 object-contain md:h-60 md:w-60" />
        <div className="my-auto w-full max-w-md">
          <section
            className="relative w-full rounded-3xl border border-vibrant-purple bg-gradient-to-r from-vibrant-purple to-deep-navy p-6 text-right sm:p-8 border-t-8 border-t-vibrant-purple"
            aria-label="لوحة تسجيل التاجر"
          >
            {children}
          </section>

          <p className="mt-6 text-center text-xs font-medium text-slate-400">
            صُنع بأيادي عراقية © 2026
          </p>
        </div>
      </main>
    </div>
  );
};
