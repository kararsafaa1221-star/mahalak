/**
 * Backup Service - Mahalak Platform
 * Handles exporting and importing user data as JSON files.
 */

export const BackupService = {
  /**
   * Exports data as a JSON file
   * @param data The data object to export
   * @param fileName The name of the file (without extension)
   */
  exportToJson: (data: any, fileName: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  },

  /**
   * Reads a JSON file and returns the parsed object
   * @param file The File object from an input element
   */
  importFromJson: (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          resolve(json);
        } catch {
          reject(new Error('Invalid JSON file format'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  }
};
