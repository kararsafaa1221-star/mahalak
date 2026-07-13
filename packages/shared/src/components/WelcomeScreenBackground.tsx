import React, { memo } from 'react';
import { motion } from 'motion/react';

const WELCOME_STARS = [
  { top: '5%', left: '8%', size: 3, delay: 0, duration: 2.2 },
  { top: '8%', left: '22%', size: 2, delay: 0.4, duration: 2.8 },
  { top: '12%', left: '68%', size: 4, delay: 0.2, duration: 2.5 },
  { top: '10%', left: '88%', size: 3, delay: 1.1, duration: 3.0 },
  { top: '18%', left: '42%', size: 2, delay: 0.8, duration: 2.4 },
  { top: '24%', left: '92%', size: 3, delay: 1.6, duration: 2.9 },
  { top: '28%', left: '6%', size: 4, delay: 0.5, duration: 3.2 },
  { top: '32%', left: '55%', size: 2, delay: 2.0, duration: 2.6 },
  { top: '38%', left: '78%', size: 3, delay: 0.9, duration: 2.3 },
  { top: '44%', left: '18%', size: 2, delay: 1.4, duration: 3.4 },
  { top: '48%', left: '38%', size: 3, delay: 0.3, duration: 2.7 },
  { top: '52%', left: '72%', size: 2, delay: 1.8, duration: 2.5 },
  { top: '58%', left: '94%', size: 4, delay: 0.6, duration: 3.1 },
  { top: '62%', left: '12%', size: 2, delay: 2.2, duration: 2.8 },
  { top: '66%', left: '48%', size: 3, delay: 1.0, duration: 2.4 },
  { top: '72%', left: '28%', size: 2, delay: 1.7, duration: 3.3 },
  { top: '76%', left: '82%', size: 3, delay: 0.7, duration: 2.6 },
  { top: '82%', left: '58%', size: 2, delay: 2.4, duration: 2.9 },
  { top: '86%', left: '8%', size: 3, delay: 1.3, duration: 2.2 },
  { top: '90%', left: '35%', size: 2, delay: 0.1, duration: 3.5 },
  { top: '92%', left: '68%', size: 4, delay: 1.9, duration: 2.5 },
  { top: '16%', left: '58%', size: 2, delay: 2.6, duration: 3.0 },
  { top: '36%', left: '62%', size: 3, delay: 0.15, duration: 2.1 },
  { top: '54%', left: '88%', size: 2, delay: 2.8, duration: 2.7 },
] as const;

const WELCOME_PARTICLES = [
  { left: '8%', delay: 0, duration: 7, size: 5 },
  { left: '18%', delay: 1.2, duration: 9, size: 4 },
  { left: '28%', delay: 2.4, duration: 8, size: 6 },
  { left: '38%', delay: 0.6, duration: 10, size: 4 },
  { left: '48%', delay: 3.1, duration: 7.5, size: 5 },
  { left: '58%', delay: 1.8, duration: 9.5, size: 3 },
  { left: '68%', delay: 0.3, duration: 8.5, size: 6 },
  { left: '78%', delay: 2.7, duration: 7, size: 4 },
  { left: '88%', delay: 1.5, duration: 10, size: 5 },
  { left: '95%', delay: 3.8, duration: 8, size: 3 },
  { left: '14%', delay: 4.2, duration: 9, size: 4 },
  { left: '44%', delay: 2.1, duration: 11, size: 5 },
  { left: '74%', delay: 4.8, duration: 8.5, size: 4 },
  { left: '52%', delay: 5.2, duration: 9, size: 3 },
  { left: '32%', delay: 3.5, duration: 10, size: 5 },
  { left: '62%', delay: 5.8, duration: 7.5, size: 4 },
  { left: '84%', delay: 6.1, duration: 9.5, size: 6 },
  { left: '22%', delay: 6.5, duration: 8, size: 3 },
] as const;

const LITE_STARS = WELCOME_STARS.filter((_, i) => i % 3 === 0);

const orbLoop = (duration: number, delay = 0) => ({
  duration,
  repeat: Infinity,
  ease: 'easeInOut' as const,
  delay,
});

type WelcomeScreenBackgroundProps = {
  /** أخف: بدون أوراب motion وجسيمات — مناسب للمودالات */
  lite?: boolean;
};

function WelcomeScreenBackgroundInner({ lite = false }: WelcomeScreenBackgroundProps) {
  if (lite) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-mahalak-gradient" />
        <div className="absolute top-[-18%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-vibrant-purple/30 blur-[100px]" />
        <div className="absolute bottom-[-16%] left-[-12%] h-[24rem] w-[24rem] rounded-full bg-violet/25 blur-[100px]" />
        {LITE_STARS.map((star, index) => (
          <span
            key={`lite-star-${index}`}
            className="welcome-star"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: 0.7,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,transparent_0%,rgba(11,19,32,0.65)_100%)]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-mahalak-gradient" />

      <div className="welcome-aurora welcome-aurora--purple" />
      <div className="welcome-aurora welcome-aurora--violet" />

      <motion.div
        className="absolute top-[-15%] right-[-15%] h-[32rem] w-[32rem] rounded-full bg-vibrant-purple/45 blur-[110px]"
        animate={{
          x: [0, 70, -40, 0],
          y: [0, -55, 45, 0],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={orbLoop(7)}
      />
      <motion.div
        className="absolute bottom-[-15%] left-[-15%] h-[32rem] w-[32rem] rounded-full bg-violet/40 blur-[110px]"
        animate={{
          x: [0, -65, 50, 0],
          y: [0, 55, -40, 0],
          scale: [1, 0.82, 1.2, 1],
        }}
        transition={orbLoop(8, 0.8)}
      />
      <motion.div
        className="absolute top-[20%] left-[-20%] h-80 w-80 rounded-full bg-vibrant-purple/30 blur-[90px]"
        animate={{
          x: [0, 90, 30, 0],
          y: [0, 30, 80, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={orbLoop(9, 1.5)}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vibrant-purple/20 blur-[130px]"
        animate={{
          scale: [1, 1.35, 0.95, 1],
          opacity: [0.55, 0.9, 0.5, 0.55],
        }}
        transition={orbLoop(5, 0.3)}
      />

      <motion.div
        className="welcome-light-beam welcome-light-beam--left"
        animate={{ opacity: [0.15, 0.45, 0.15], rotate: [0, 8, 0] }}
        transition={orbLoop(6)}
      />
      <motion.div
        className="welcome-light-beam welcome-light-beam--right"
        animate={{ opacity: [0.1, 0.4, 0.1], rotate: [0, -10, 0] }}
        transition={orbLoop(7, 1)}
      />

      {WELCOME_PARTICLES.map((particle, index) => (
        <span
          key={`particle-${index}`}
          className="welcome-particle"
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            ['--rise-duration' as string]: `${particle.duration}s`,
            ['--rise-delay' as string]: `${particle.delay}s`,
          }}
        />
      ))}

      {WELCOME_STARS.map((star, index) => (
        <span
          key={`star-${index}`}
          className="welcome-star welcome-star--bright"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            ['--twinkle-duration' as string]: `${star.duration}s`,
            ['--twinkle-delay' as string]: `${star.delay}s`,
          }}
        />
      ))}

      <div className="welcome-grid-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,transparent_0%,rgba(11,19,32,0.65)_100%)]" />
    </div>
  );
}

export const WelcomeScreenBackground = memo(WelcomeScreenBackgroundInner);
