import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';

// =======================================================
// مكون رفع ومعالجة الصور للهواتف والموقع - منصة محلك
// يدعم الاختيار من المعرض (Gallery) أو الالتقاط المباشر (Camera)
// مع ضغط وتقليص حجم تلقائي (Image Resizing) محلياً قبل الحفظ
// =======================================================

// دالة خارجية مساعدة لتقليص الحجم والضغط - قابلة للاستخدام في أي مكان بالمشروع
export const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new window.Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // حساب الأبعاد الذكية المناسبة مع الحفاظ على النسبة والتناسب
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // رسم الصورة على الكانفاس لتخفيض دقتها
        ctx?.drawImage(img, 0, 0, width, height);
        
        // تحويل النتيجة لـ WebP مضغوط أو JPEG بجودة 80% (أقل حجماً وأسرع بالرفع)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('فشل معالجة وقراءة ملف الصورة الحالي.'));
      };
      
      img.src = result;
    };
    
    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف المختار من الذاكرة.'));
    };
    
    reader.readAsDataURL(file);
  });
};

interface ImageUploaderProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'auto';
  maxSizeMB?: number;
  required?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'صورة المنتج',
  placeholder = 'اضغط لإضافة صورة المنتج',
  aspectRatio = 'square',
  maxSizeMB = 5,
  required = false,
  className = ''
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showChooser, setShowChooser] = useState(false);

  // تنسيق أبعاد الحاوية
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'landscape': return 'aspect-video';
      case 'portrait': return 'aspect-[3/4]';
      case 'auto': return '';
      default: return 'aspect-square';
    }
  };

  // معالجة اختيار الملف وضغطه
  const handleFileSelect = async (file: File) => {
    setError('');
    setIsLoading(true);
    setShowChooser(false);

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      setIsLoading(false);
      return;
    }

    // التحقق من حجم الملف كعتبة عليا
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`حجم الصورة كبير جداً. الحد الأقصى المسموح به هو ${maxSizeMB} ميجابايت.`);
      setIsLoading(false);
      return;
    }

    try {
      // استدعاء دالة الضغط والتقليص الذكي
      const compressedBase64 = await resizeImage(file, 800, 800);
      onChange(compressedBase64);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء معالجة وضغط الصورة المحددة.');
    } finally {
      setIsLoading(false);
    }
  };

  // معالجة تغيير ملف الاستوديو (الغاليري)
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // معالجة تغيير ملف الكاميرا (الالتقاط المباشر)
  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // معالجة سحب وإفلات الملفات من الكمبيوتر
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

  const handleRemove = () => {
    onChange('');
    setError('');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
      {label && (
        <label className="block text-xs font-black text-slate-500 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* حاوية الرفع والمعاينة */}
      <div 
        className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${getAspectClass()} ${
          dragActive 
            ? 'border-[#9952FF] bg-[#f5eeff]' 
            : value 
              ? 'border-emerald-400 bg-emerald-50/10' 
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* حالة معالجة الحجم وضغط الملف */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
            <div className="w-10 h-10 border-4 border-[#9952FF] border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-black text-[#9952FF] animate-pulse">جاري ضغط وضبط حجم الصورة...</span>
          </div>
        )}

        {value ? (
          /* في حالة وجود صورة مسبقاً */
          <div className="relative w-full h-full group">
            <img 
              src={value} 
              alt="صورة المنتج المعالجة" 
              className="w-full h-full object-cover"
              onError={() => {
                setError('حدث خطأ أثناء عرض الصورة الحالية.');
              }}
            />
            
            {/* واجهة تحكم بالصورة المرفوعة */}
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => setShowChooser(true)}
                className="p-3 bg-white hover:bg-slate-100 text-slate-800 rounded-xl transition shadow-lg flex items-center gap-1.5 text-xs font-black"
                title="تغيير الصورة الحالي للمنتج"
              >
                <Camera size={16} className="text-[#9952FF]" />
                <span>تغيير الصورة</span>
              </button>
              <button 
                type="button"
                onClick={handleRemove}
                className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition shadow-lg flex items-center gap-1.5 text-xs font-black"
                title="حذف الصورة"
              >
                <X size={16} />
                <span>حذف</span>
              </button>
            </div>

            {/* علامة اكتمال الرفع والمطابقة */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center gap-1 shadow">
              <span>جاهزة ومضغوطة</span>
            </div>
          </div>
        ) : (
          /* منطقة المربع الفارغ المحفز للنقر */
          <button 
            type="button"
            onClick={() => setShowChooser(true)}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 group"
          >
            <div className={`p-4 rounded-2xl mb-3 shadow-xs transition group-hover:scale-105 ${dragActive ? 'bg-violet-100' : 'bg-slate-100 text-slate-400 group-hover:text-[#9952FF] group-hover:bg-[#f5eeff]'}`}>
              <Upload size={24} />
            </div>
            <span className="text-xs font-black text-slate-800 text-center">
              {placeholder}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-bold">
              اضغط لفتح (الكاميرا 📸 / المعرض 🖼️)
            </span>
          </button>
        )}
      </div>

      {/* حقل الاستوديو المخفي - لفتح المعرض */}
      <input 
        ref={galleryInputRef}
        type="file" 
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* حقل الكاميرا المخفي - لفتح الكاميرا فوراً في الأجهزة الذكية */}
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />

      {/* نافذة المنبثقة لاختيار المصدر (Camera or Gallery) */}
      {showChooser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-slide-up sm:animate-fade-in">
            {/* رأس النافذة */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black text-slate-800">إضافة صورة المنتج</span>
              <button 
                type="button" 
                onClick={() => setShowChooser(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* الخيارات المتوفرة */}
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-slate-400 font-black mb-1 text-center">اختر الوسيلة المفضلة لإضافة لقطة للمنتج:</p>
              
              {/* خيار التقاط صورة الكاميرا */}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  cameraInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-[#9952FF]/10 text-[#9952FF] hover:bg-[#9952FF]/20 border border-[#9952FF]/20 rounded-2xl flex items-center justify-center gap-3 transition font-black text-xs"
              >
                <Camera size={18} />
                <span>التقاط لقطة فورية بالكاميرا 📸</span>
              </button>

              {/* خيار اختيار من استوديو الهاتف */}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  galleryInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 transition font-black text-xs"
              >
                <ImageIcon size={18} className="text-slate-500" />
                <span>اختيار من استوديو الصور (المعرض) 🖼️</span>
              </button>

              {/* زر إلغاء الإغلاق */}
              <button
                type="button"
                onClick={() => setShowChooser(false)}
                className="w-full py-2.5 text-center text-slate-400 hover:text-slate-600 transition font-bold text-xs"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* عرض تنبيهات الخطأ إن وجدت */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-2xl font-bold flex items-start gap-2 animate-fade-in leading-relaxed">
          <X size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
