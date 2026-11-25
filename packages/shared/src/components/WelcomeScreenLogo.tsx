import React from 'react';
import { MahalakLogo } from './MahalakLogo';

interface WelcomeScreenLogoProps {
  step: number;
}

export const WelcomeScreenLogo: React.FC<WelcomeScreenLogoProps> = ({ step }) => {
  const isLarge = step === 1;

  return (
    <div className={`relative ${isLarge ? 'mb-8' : 'mb-5'}`}>
      <MahalakLogo
        className={`relative object-contain ${isLarge ? 'mb-2 h-48 w-48 md:h-60 md:w-60' : 'h-24 w-24 md:h-28 md:w-28 opacity-95'}`}
      />
    </div>
  );
};
