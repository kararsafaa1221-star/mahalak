import React from 'react';

export function LegalGlowCard({
  children,
  className = '',
  padding = 'p-4 sm:p-5',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={`welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.2rem] shadow-lg relative overflow-hidden ${padding} ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
