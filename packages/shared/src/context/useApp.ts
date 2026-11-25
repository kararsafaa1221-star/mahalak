import { useContext } from 'react';
import { AppContextStore } from './AppContextStore';

export const useApp = () => {
  const context = useContext(AppContextStore);
  if (!context) throw new Error('useApp error');
  return context;
};
