import { useContext } from 'react';
import { AppContext } from './AppContext';

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp error');
  return context;
};
