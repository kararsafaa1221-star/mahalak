/**
 * خدمة التخزين المحلي - منصة محلك
 */

export const StorageService = {
  save: (key: string, data: any) => {
    try {
      localStorage.setItem(`mahalak_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  },

  get: (key: string) => {
    try {
      const data = localStorage.getItem(`mahalak_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(`mahalak_${key}`);
  },

  clearAll: () => {
    localStorage.clear();
  }
};
