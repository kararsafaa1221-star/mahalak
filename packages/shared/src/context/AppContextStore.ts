import { createContext } from 'react';
import type { AppContextType } from './AppContext';

export const AppContextStore = createContext<AppContextType | undefined>(undefined);
