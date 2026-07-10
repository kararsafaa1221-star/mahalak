import { useContext } from 'react';
import { AdminContext } from './AdminContext';

export const useApp = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useApp must be used within AdminProvider');
  return context;
};
