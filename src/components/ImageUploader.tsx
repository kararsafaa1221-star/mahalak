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

  // حالات نافذة التحكم بالصورة (التكبير والتصغير وتعديل الموضع)
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // حساب أبعاد منظور القص بناءً على النسبة والطلب
  const cropWidth = 280;
  let cropHeight = 280;
  if (aspectRatio === 'landscape') {
    cropHeight = 157;
  } else if (aspectRatio === 'portrait') {
    cropHeight = 280;
  }

  // حساب أبعاد الصورة الأولية لتغطية مساحة المنظور بالكامل (Cover)
  let renderWidth = cropWidth;
  let renderHeight = cropHeight;
  
  if (imageDimensions.width && imageDimensions.height) {
    const imgRatio = imageDimensions.width / imageDimensions.height;
    const viewRatio = cropWidth / cropHeight;
    
    if (imgRatio > viewRatio) {
      renderHeight = cropHeight;
      renderWidth = cropHeight * imgRatio;
    } else {
      renderWidth = cropWidth;
      renderHeight = cropWidth / imgRatio;
    }
  }

  // تنسيق أبعاد الحاوية للعرض النهائي
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'landscape': return 'aspect-video';
      case 'portrait': return 'aspect-[3/4]';
      case 'auto': return '';
      default: return 'aspect-square';
    }
  };

  // معالجة اختيار الملف وقراءة أبعاده الأصلية لتمكين التكبير والتصغير
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // جلب مقاسات الصورة الأصلية بدقة
        const tempImg = new window.Image();
        tempImg.onload = () => {
          setImageDimensions({ width: tempImg.width, height: tempImg.height });
          setEditingImage(result);
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          setIsLoading(false);
        };
        tempImg.onerror = () => {
          setError('فشل قراءة مقاسات ملف الصورة المختارة.');
          setIsLoading(false);
        };
        tempImg.src = result;
      };
      reader.onerror = () => {
        setError('فشل قراءة الملف المختار من الذاكرة.');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تحميل الصورة.');
      setIsLoading(false);
    }
  };

  // معالجة تأكيد تعديل الصورة وحفظها بعد القص والتعديل
  const handleCropConfirm = () => {
    if (!editingImage) return;
    setIsLoading(true);
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // حجم كانفاس الإخراج بجودة عالية ومثالية
        const targetWidth = 800;
        let targetHeight = 800;
        
        if (aspectRatio === 'landscape') {
          targetHeight = 450;
        } else if (aspectRatio === 'portrait') {
          targetHeight = 1066;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('فشل إنشاء بيئة الرسم للقص.');
        }
        
        // تعبئة خلفية بيضاء نقية
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // حساب نسبة التكبير المتوافقة بين منظور القص وحجم الإخراج الفعلي للكانفاس
        const VWidth = cropWidth;
        const VHeight = cropHeight;
        const factor = targetWidth / VWidth;
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgRatio = imgWidth / imgHeight;
        const viewRatio = VWidth / VHeight;
        
        let renderWidthCanvas = VWidth;
        let renderHeightCanvas = VHeight;
        
        if (imgRatio > viewRatio) {
          renderHeightCanvas = VHeight;
          renderWidthCanvas = VHeight * imgRatio;
        } else {
          renderWidthCanvas = VWidth;
          renderHeightCanvas = VWidth / imgRatio;
        }
        
        const initialXCanvas = (VWidth - renderWidthCanvas) / 2;
        const initialYCanvas = (VHeight - renderHeightCanvas) / 2;
        
        ctx.save();
        const cx = (initialXCanvas + renderWidthCanvas / 2) * factor;
        const cy = (initialYCanvas + renderHeightCanvas / 2) * factor;
        
        // تطبيق مصفوفة التحويلات الجيبية لموضع الفأرة والسحب الحالي للمستخدم مع الزوم
        ctx.translate(cx + position.x * factor, cy + position.y * factor);
        ctx.scale(zoom, zoom);
        
        const rw = renderWidthCanvas * factor;
        const rh = renderHeightCanvas * factor;
        ctx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
        ctx.restore();
        
        // استخراج الصورة مضغوطة بجودة عالية
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        onChange(croppedBase64);
        setEditingImage(null);
      } catch (err: any) {
        setError(err?.message || 'حدث خطأ غير متوقع أثناء حفظ وتعديل الصورة.');
      } finally {
        setIsLoading(false);
      }
    };
    img.onerror = () => {
      setError('فشل تحميل الصورة المحددة لمعالجتها.');
      setIsLoading(false);
    };
    img.src = editingImage;
  };

  // معالجات السحب والتحريك للماوس واللمس (Drag & Pan handlers)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.current.x,
      y: e.touches[0].clientY - dragStart.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
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
              <span className="text-xs font-black text-slate-800">إضافة صورة</span>
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
              <p className="text-[11px] text-slate-400 font-black mb-1 text-center">اختر الوسيلة المفضلة لإضافة لقطة للصورة:</p>
              
              {/* خيار التقاط صورة الكاميرا */}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  cameraInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-[#9952FF]/10 text-[#9952FF] hover:bg-[#9952FF]/20 border border-[#9952FF]/20 rounded-2xl flex items-center justify-center gap-3 transition font-black text-xs animate-pulse-once"
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

      {/* نافذة التحرير المتقدمة للتحكم في الصورة بالتكبير والتصغير والتحريك */}
      {editingImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 scale-95 hover:scale-100 transition-transform duration-300">
            
            {/* رأس المودال */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#4D2980]">تحرير وتعديل مقاس الصورة 📐</span>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingImage(null)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* محتوى المودال */}
            <div className="p-6 flex flex-col items-center">
              <p className="text-[11px] text-slate-500 font-extrabold text-center mb-4 leading-relaxed">
                قم بالتحكم بحجم الصورة بالتكبير والتصغير وتعديل الموضع المناسب من خلال السحب، ليظهر بالشكل الذي تريده تماماً.
              </p>

              {/* حاوية منطقة القص */}
              <div className="w-full bg-slate-950 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[310px] shadow-inner relative">
                {/* نافذة المنظور للقص */}
                <div 
                  className="relative overflow-hidden border-2 border-dashed border-[#9952FF] bg-slate-900 shadow-2xl rounded-xl cursor-move touch-none"
                  style={{ 
                    width: `${cropWidth}px`, 
                    height: `${cropHeight}px` 
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* عرض الصورة مع المتغيرات وعامل التكبير والتصغير */}
                  <img 
                    src={editingImage} 
                    alt="تحرير المعاينة" 
                    className="absolute pointer-events-none max-w-none origin-center select-none"
                    style={{
                      left: `calc(50% - ${renderWidth/2}px + ${position.x}px)`,
                      top: `calc(50% - ${renderHeight/2}px + ${position.y}px)`,
                      width: `${renderWidth}px`,
                      height: `${renderHeight}px`,
                      transform: `scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  />
                </div>
              </div>

              {/* عناصر التحكم بالتكبير والتصغير */}
              <div className="w-full mt-6 space-y-3 px-2">
                <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
                  <span>المقياس المباشر: {(zoom * 100).toFixed(0)}%</span>
                  <span className="text-[#9952FF]">اسحب لتعديل الاتجاه ↔️</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.max(1, prev - 0.15))}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all text-sm cursor-pointer select-none"
                    title="تصغير الصورة"
                  >
                    -
                  </button>
                  
                  <input 
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#9952FF] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.min(4, prev + 0.15))}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all text-sm cursor-pointer select-none"
                    title="تكبير الصورة"
                  >
                    +
                  </button>
                </div>
                
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black active:scale-95 transition-all cursor-pointer"
                  >
                    إعادة ضبط المقاس 🔄
                  </button>
                </div>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>حفظ وتأكيد الصورة 🌿</span>
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
