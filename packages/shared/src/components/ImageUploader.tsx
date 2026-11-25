import React, { useState, useRef, useMemo } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { computeCoverDimensions, normalizeImageForEditing } from '../utils/imageCrop';
import i18n from '../i18n';

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
        reject(new Error(i18n.t('imageUploader.errors.processReadFailed')));
      };
      
      img.src = result;
    };
    
    reader.onerror = () => {
      reject(new Error(i18n.t('imageUploader.errors.fileReadFailed')));
    };
    
    reader.readAsDataURL(file);
  });
};

interface ImageUploaderProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  labelClassName?: string;
  placeholder?: string;
  placeholderClassName?: string;
  hideSourceHint?: boolean;
  emptyVariant?: 'default' | 'brand';
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'auto';
  maxSizeMB?: number;
  required?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label,
  labelClassName = 'block text-xs font-black text-slate-500 mb-1',
  placeholder,
  placeholderClassName,
  hideSourceHint = false,
  emptyVariant = 'default',
  aspectRatio = 'square',
  maxSizeMB = 0,
  required = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const displayLabel = label ?? t('imageUploader.productImageLabel');
  const displayPlaceholder = placeholder ?? t('imageUploader.placeholder');
  const isBrandEmpty = emptyVariant === 'brand' && !value;
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
  const { width: renderWidth, height: renderHeight } = useMemo(
    () => computeCoverDimensions(imageDimensions.width, imageDimensions.height, cropWidth, cropHeight),
    [imageDimensions.width, imageDimensions.height, cropWidth, cropHeight],
  );

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
      setError(t('imageUploader.errors.invalidType'));
      setIsLoading(false);
      return;
    }

    // التحقق من حجم الملف (maxSizeMB <= 0 = بدون حد)
    const fileSizeMB = file.size / (1024 * 1024);
    if (maxSizeMB > 0 && fileSizeMB > maxSizeMB) {
      setError(t('imageUploader.errors.fileTooLarge', { max: maxSizeMB }));
      setIsLoading(false);
      return;
    }

    try {
      const normalized = await normalizeImageForEditing(file);
      setImageDimensions({ width: normalized.width, height: normalized.height });
      setEditingImage(normalized.dataUrl);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || t('imageUploader.errors.loadFailed'));
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
          throw new Error(t('imageUploader.errors.canvasFailed'));
        }
        
        // تعبئة خلفية بيضاء نقية
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // حساب نسبة التكبير المتوافقة بين منظور القص وحجم الإخراج الفعلي للكانفاس
        const VWidth = cropWidth;
        const VHeight = cropHeight;
        const factor = targetWidth / VWidth;
        
        const imgWidth = imageDimensions.width || img.width;
        const imgHeight = imageDimensions.height || img.height;
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
        
        const cx = (VWidth / 2) * factor;
        const cy = (VHeight / 2) * factor;
        ctx.save();
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
        setError(err?.message || t('imageUploader.errors.saveFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    img.onerror = () => {
      setError(t('imageUploader.errors.processFailed'));
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
      {displayLabel && (
        <label className={labelClassName}>
          {displayLabel} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* حاوية الرفع والمعاينة */}
      <div 
        className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${getAspectClass()} ${
          dragActive 
            ? 'border-vibrant-purple bg-violet/10' 
            : value 
              ? 'border-emerald-400 bg-emerald-50/10' 
              : isBrandEmpty
                ? 'border-white/50 bg-deep-navy hover:bg-deep-navy/90'
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
            <div className="w-10 h-10 border-4 border-vibrant-purple border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-black text-vibrant-purple animate-pulse">{t('imageUploader.compressing')}</span>
          </div>
        )}

        {value ? (
          /* في حالة وجود صورة مسبقاً */
          <div className="relative w-full h-full group">
            <img 
              src={value} 
              alt={t('imageUploader.previewAlt')}
              className="w-full h-full object-cover"
              onError={() => {
                setError(t('imageUploader.errors.displayFailed'));
              }}
            />
            
            {/* واجهة تحكم بالصورة المرفوعة */}
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => setShowChooser(true)}
                className="p-3 bg-white hover:bg-slate-100 text-slate-800 rounded-xl transition shadow-lg flex items-center gap-1.5 text-xs font-black"
                title={t('imageUploader.changeImageTitle')}
              >
                <Camera size={16} className="text-vibrant-purple" />
                <span>{t('imageUploader.changeImage')}</span>
              </button>
              <button 
                type="button"
                onClick={handleRemove}
                className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition shadow-lg flex items-center gap-1.5 text-xs font-black"
                title={t('imageUploader.deleteImageTitle')}
              >
                <X size={16} />
                <span>{t('common.delete')}</span>
              </button>
            </div>

            {/* علامة اكتمال الرفع والمطابقة */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center gap-1 shadow">
              <span>{t('imageUploader.readyCompressed')}</span>
            </div>
          </div>
        ) : (
          /* منطقة المربع الفارغ المحفز للنقر */
          <button 
            type="button"
            onClick={() => setShowChooser(true)}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 group"
          >
            <div className={`p-4 rounded-2xl mb-3 shadow-xs transition group-hover:scale-105 ${
              dragActive
                ? 'bg-violet-100'
                : isBrandEmpty
                  ? 'bg-white/10 text-white'
                  : 'bg-slate-100 text-slate-400 group-hover:text-vibrant-purple group-hover:bg-violet/10'
            }`}>
              <Upload size={24} />
            </div>
            <span className={`text-xs font-black text-center ${
              placeholderClassName ?? (isBrandEmpty ? 'text-white' : 'text-slate-800')
            }`}>
              {displayPlaceholder}
            </span>
            {!hideSourceHint && (
              <span className="text-[10px] text-slate-400 mt-1 font-bold">
                {t('imageUploader.sourceHint')}
              </span>
            )}
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
        <div className="fixed inset-0 bg-deep-navy/70 backdrop-blur-md z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up sm:animate-fade-in text-white">
            {/* رأس النافذة */}
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-white/5">
              <span className="text-xs font-black text-white">{t('imageUploader.addImage')}</span>
              <button 
                type="button" 
                onClick={() => setShowChooser(false)}
                className="p-1 hover:bg-white/15 rounded-lg transition text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* الخيارات المتوفرة */}
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-white/55 font-black mb-1 text-center">{t('imageUploader.chooseMethod')}</p>
              
              {/* خيار التقاط صورة الكاميرا */}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  cameraInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-vibrant-purple/25 text-[#E8D5FF] hover:bg-vibrant-purple/40 border border-vibrant-purple/40 rounded-2xl flex items-center justify-center gap-3 transition font-black text-xs animate-pulse-once"
              >
                <Camera size={18} />
                <span>{t('imageUploader.takePhoto')}</span>
              </button>

              {/* خيار اختيار من استوديو الهاتف */}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  galleryInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/25 rounded-2xl flex items-center justify-center gap-3 transition font-black text-xs"
              >
                <ImageIcon size={18} className="text-white/70" />
                <span>{t('imageUploader.chooseGallery')}</span>
              </button>

              {/* زر إلغاء الإغلاق */}
              <button
                type="button"
                onClick={() => setShowChooser(false)}
                className="w-full py-2.5 text-center text-white/50 hover:text-white transition font-bold text-xs"
              >
                {t('imageUploader.cancelAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التحرير المتقدمة للتحكم في الصورة بالتكبير والتصغير والتحريك */}
      {editingImage && (
        <div className="fixed inset-0 bg-deep-navy/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-95 hover:scale-100 transition-transform duration-300 text-white">
            
            {/* رأس المودال */}
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#fff700]">{t('imageUploader.cropTitle')}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingImage(null)}
                className="p-1 hover:bg-white/15 rounded-lg transition text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* محتوى المودال */}
            <div className="p-6 flex flex-col items-center">
              <p className="text-[11px] text-white/65 font-extrabold text-center mb-4 leading-relaxed">
                {t('imageUploader.cropInstructions')}
              </p>

              {/* حاوية منطقة القص */}
              <div className="w-full bg-deep-navy rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[310px] shadow-inner relative">
                {/* نافذة المنظور للقص — dir=ltr لتجنب انزياح المحاذاة في الواجهة العربية */}
                <div 
                  className="relative overflow-hidden border-2 border-dashed border-vibrant-purple bg-slate-900 shadow-2xl rounded-xl cursor-move touch-none"
                  dir="ltr"
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
                  <img 
                    src={editingImage} 
                    alt={t('imageUploader.cropPreviewAlt')}
                    draggable={false}
                    className="absolute pointer-events-none max-w-none select-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${renderWidth}px`,
                      height: `${renderHeight}px`,
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    }}
                  />
                </div>
              </div>

              {/* عناصر التحكم بالتكبير والتصغير */}
              <div className="w-full mt-6 space-y-3 px-2">
                <div className="flex items-center justify-between text-[11px] font-black text-white/60">
                  <span>{t('imageUploader.scaleLabel', { percent: (zoom * 100).toFixed(0) })}</span>
                  <span className="text-[#E8D5FF]">{t('imageUploader.dragHint')}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.max(1, prev - 0.15))}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all text-sm cursor-pointer select-none"
                    title={t('imageUploader.zoomOut')}
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
                    className="flex-1 accent-[#7B3DFF] h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.min(4, prev + 0.15))}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all text-sm cursor-pointer select-none"
                    title={t('imageUploader.zoomIn')}
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
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/25 rounded-lg text-[10px] font-black active:scale-95 transition-all cursor-pointer"
                  >
                    {t('imageUploader.resetScale')}
                  </button>
                </div>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="px-6 py-4 border-t border-white/15 bg-white/5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-5 py-2.5 bg-white/5 border border-white/25 hover:bg-white/10 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>{t('imageUploader.saveConfirm')}</span>
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
