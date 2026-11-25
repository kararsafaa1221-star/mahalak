import React, { memo } from 'react';

const STATIC_STARS = [
  { top: '8%', left: '12%', size: 2 },
  { top: '14%', left: '72%', size: 3 },
  { top: '22%', left: '28%', size: 2 },
  { top: '36%', left: '88%', size: 2 },
  { top: '48%', left: '16%', size: 3 },
  { top: '62%', left: '64%', size: 2 },
  { top: '78%', left: '42%', size: 2 },
  { top: '86%', left: '80%', size: 3 },
] as const;

type WelcomeScreenBackgroundProps = {
  /** Kept for API compatibility; background is always lightweight. */
  lite?: boolean;
};

function WelcomeScreenBackgroundInner(_props: WelcomeScreenBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-mahalak-gradient" />
      <div className="absolute top-[-18%] right-[-12%] h-[22rem] w-[22rem] rounded-full bg-vibrant-purple/20" />
      <div className="absolute bottom-[-16%] left-[-12%] h-[20rem] w-[20rem] rounded-full bg-violet/15" />
      {STATIC_STARS.map((star, index) => (
        <span
          key={`star-${index}`}
          className="welcome-star welcome-star--static"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: 0.45,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,transparent_0%,rgba(11,19,32,0.65)_100%)]" />
    </div>
  );
}

export const WelcomeScreenBackground = memo(WelcomeScreenBackgroundInner);
