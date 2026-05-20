import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';

// ==========================================
// مكون رفع الصور - منصة محلك
// يدعم رفع الصور من الجهاز أو إدخال رابط URL
// ==========================================

interface ImageUploaderProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'auto';
  maxSizeMB?: number;
  required?: boolean;
  showUrlOption?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'الصورة',
  placeholder = 'اضغط لرفع صورة من جهازك',
  aspectRatio = 'square',
  maxSizeMB = 5,
  required = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // تحديد أبعاد الصورة حسب النسبة
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'landscape': return 'aspect-video';
      case 'portrait': return 'aspect-[3/4]';
      case 'auto': return '';
      default: return 'aspect-square';
    }
  };

  // معالجة اختيار الملف
  const handleFileSelect = async (file: File) => {
    setError('');
    setIsLoading(true);

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, GIF, WebP)');
      setIsLoading(false);
      return;
    }

    // التحقق من حجم الملف
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`حجم الصورة يجب أن يكون أقل من ${maxSizeMB} ميجابايت. الحجم الحالي: ${fileSizeMB.toFixed(2)} MB`);
      setIsLoading(false);
      return;
    }

    try {
      // قراءة الملف وتحويله لـ Base64 Data URL
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // ضغط الصورة إذا كانت كبيرة جداً
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // تحديد الأبعاد القصوى
          const maxWidth = 800;
          const maxHeight = 800;
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          // تحويل إلى JPEG مضغوط
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          onChange(compressedDataUrl);
          setIsLoading(false);
        };
        
        img.onerror = () => {
          setError('فشل في معالجة الصورة، حاول مرة أخرى');
          setIsLoading(false);
        };
        
        img.src = result;
      };
      
      reader.onerror = () => {
        setError('فشل في قراءة الملف، حاول مرة أخرى');
        setIsLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch {
      setError('حدث خطأ أثناء رفع الصورة');
      setIsLoading(false);
    }
  };

  // معالجة السحب والإفلات
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // معالجة تغيير الملف من الـ input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // حذف الصورة
  const handleRemove = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-xs font-bold text-gray-500 mb-1 ${className.includes('text-center') || className.includes('mx-auto') ? 'text-center' : ''}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* منطقة عرض/رفع الصورة */}
      <div 
        className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${getAspectClass()} ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : value 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* حالة التحميل */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-bold text-indigo-600">جارٍ رفع الصورة...</span>
          </div>
        )}

        {/* عرض الصورة المرفوعة */}
        {value ? (
          <div className="relative w-full h-full group">
            <img 
              src={value} 
              alt="الصورة المرفوعة" 
              className="w-full h-full object-cover"
              onError={() => {
                setError('فشل في تحميل الصورة، تأكد من صحة الرابط');
              }}
            />
            
            {/* أزرار التحكم */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white rounded-xl text-gray-700 hover:bg-gray-100 transition shadow-lg"
                title="تغيير الصورة"
              >
                <Camera size={20} />
              </button>
              <button 
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-500 rounded-xl text-white hover:bg-red-600 transition shadow-lg"
                title="حذف الصورة"
              >
                <X size={20} />
              </button>
            </div>

            {/* علامة النجاح */}
            <div className="absolute top-2 right-2 p-1.5 bg-green-500 text-white rounded-full shadow">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        ) : (
          /* منطقة الرفع الفارغة */
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
          >
            <div className={`p-4 rounded-full mb-3 ${dragActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              {dragActive ? (
                <Upload size={28} className="text-indigo-600" />
              ) : (
                <ImageIcon size={28} className="text-gray-400" />
              )}
            </div>
            <span className="text-xs font-bold text-gray-600 text-center px-4">
              {dragActive ? 'أفلت الصورة هنا' : placeholder}
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              أو اسحب وأفلت الصورة هنا
            </span>
            <span className="text-[10px] text-gray-400">
              (الحد الأقصى: {maxSizeMB} MB)
            </span>
          </button>
        )}

        {/* حقل الملف المخفي */}
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* خيار إدخال URL محذوف */}

      {/* رسالة الخطأ */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2 rounded-xl font-semibold flex items-center space-x-1 space-x-reverse">
          <X size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
