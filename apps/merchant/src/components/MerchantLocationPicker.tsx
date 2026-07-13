import React from 'react';
import { LocationPicker } from '@shared/components/LocationPicker';

type MerchantLocationPickerProps = React.ComponentProps<typeof LocationPicker>;

export const MerchantLocationPicker: React.FC<MerchantLocationPickerProps> = ({
  labelClassName = 'block text-xs font-bold text-white mb-1',
  hintClassName = 'text-[10px] text-white font-bold text-center mb-1',
  inputClassName = 'text-white placeholder:text-white/50 border-white/30',
  ...props
}) => (
  <LocationPicker
    {...props}
    labelClassName={labelClassName}
    hintClassName={hintClassName}
    inputClassName={inputClassName}
  />
);
