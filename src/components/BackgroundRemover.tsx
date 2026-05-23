import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { removeBackground } from '@imgly/background-removal';
import { Camera, X, Image as ImageIcon, Sparkles, RefreshCw, Check, Upload, Palette, ShieldAlert, Move, ZoomIn, ZoomOut } from 'lucide-react';

interface BackgroundRemoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageDataUrl: string) => void;
}

export const BackgroundRemover: React.FC<BackgroundRemoverProps> = ({
  isOpen,
  onClose,
  onSelectImage
}) => {
  const [step, setStep] = useState<'source' | 'camera' | 'preview' | 'processing' | 'result'>('source');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [bgType, setBgType] = useState<'transparent' | 'white' | 'custom'>('transparent');
  const [customColor, setCustomColor] = useState<string>('#9952FF');
  const [progressText, setProgressText] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States for zoom, scale, and offset panning position inside the display frame:
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newPanX = e.clientX - dragStart.current.x;
    const newPanY = e.clientY - dragStart.current.y;
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
  };

  // Proactively request camera permission when entering "camera" step
  React.useEffect(() => {
    if (step !== 'camera') return;

    let isSubscribed = true;

    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (!isSubscribed) return;
          setHasPermission(true);
          setErrorText(null);
          // Release tracks immediately so react-webcam can claim and use it
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((err) => {
          if (!isSubscribed) return;
          console.error("Camera permission request rejected:", err);
          setHasPermission(false);
          setErrorText('يرجى تفعيل صلاحية الوصول للكاميرا من إعدادات المتصفح أو الهاتف المحمول للتمكن من التقاط الصور للمنتجات مباشرة.');
        });
    } else {
      setTimeout(() => {
        if (!isSubscribed) return;
        setHasPermission(false);
        setErrorText('المتصفح الحالي أو بيئة العمل لا تدعم الوصول المباشر لكاميرا الويب.');
      }, 0);
    }

    return () => {
      isSubscribed = false;
    };
  }, [step]);

  // Function to retry permission request manually from the UI
  const requestPermissionManually = async () => {
    setErrorText(null);
    setHasPermission(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasPermission(true);
      stream.getTracks().forEach(track => track.stop());
      // reset step momentarily to force refresh and ensure Webcam mounts clean with permissions granted
      setStep('source');
      setTimeout(() => setStep('camera'), 100);
    } catch (err: any) {
      console.error("Manual camera permission request rejected:", err);
      setHasPermission(false);
      setErrorText('فشل تفعيل صلاحية الكاميرا. يرجى تفعيل الإذن يدوياً من إعدادات المتصفح أو الهاتف المحمول.');
    }
  };

  // Preset Colors for custom backgrounds
  const themeColors = [
    '#9952FF', '#4D2980', '#00C292', '#FEC107', 
    '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D',
    '#000000', '#F1F5F9', '#FFF5F5', '#F5F3FF'
  ];

  // Camera capture helper
  const capture = useCallback(() => {
    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setCapturedImage(imageSrc);
          setStep('preview');
          setErrorText(null);
        } else {
          setErrorText('الكاميرا ليست جاهزة بعد أو تم رفض إذن الوصول إليها. يرجى الانتظار أو تفعيل إذن الكاميرا من المتصفح.');
        }
      } catch (err: any) {
        console.error("Camera capture error:", err);
        setErrorText('حدث خطأ أثناء محاولة التقاط الصورة: ' + (err.message || err));
      }
    } else {
      setErrorText('لم يتم العثور على الكاميرا. يرجى التحقق من التوصيل والإذن.');
    }
  }, [webcamRef]);

  // Handle local file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
          setStep('preview');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // The Magic Background Removal Function (Local Browser-Based)
  const runBackgroundRemoval = async () => {
    if (!capturedImage) return;
    setStep('processing');
    setErrorText(null);
    setProgressText('جاري تحميل نموذج الذكاء الاصطناعي محلياً وبدء المعالجة... (قد يستغرق بضع ثوانٍ في المرة الأولى)');

    try {
      // Run @imgly/background-removal client-side
      const response = await fetch(capturedImage);
      const inputBlob = await response.blob();
      
      const outputBlob = await removeBackground(inputBlob, {
        progress: (key, current, total) => {
          const pct = Math.round((current / total) * 100);
          setProgressText(`جاري تفريغ الخلفية: ${pct}% (${key})`);
        }
      });

      const outputUrl = URL.createObjectURL(outputBlob);
      setProcessedBlob(outputBlob);
      setProcessedUrl(outputUrl);
      setStep('result');
    } catch (err: any) {
      console.error("Background removal error:", err);
      setErrorText('عذراً، فشل تفريغ خلفية الصورة محلياً على المتصفح. يمكنك استخدام الصورة الأصلية كما هي.');
      setStep('preview');
    }
  };

  // Apply chosen background to final image via canvas
  const handleFinalize = () => {
    const imageToUse = processedUrl || capturedImage;
    if (!imageToUse) return;

    const img = new window.Image();
    img.src = imageToUse;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate high-quality canvas size (C x C) to keep the original resolution aspect ratio safely
      const C = Math.max(img.width, img.height);
      canvas.width = C;
      canvas.height = C;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw Background Color
        if (bgType === 'white') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, C, C);
        } else if (bgType === 'custom') {
          ctx.fillStyle = customColor;
          ctx.fillRect(0, 0, C, C);
        } else {
          // Transparent: clear the canvas to ensure full transparency
          ctx.clearRect(0, 0, C, C);
        }

        // Center scale offset calculations
        const paddingRatio = 0.9; // 5% padding on each side (like the container's p-4 relative padding)
        const C_avail = C * paddingRatio;
        
        const scaleFit = Math.min(C_avail / img.width, C_avail / img.height);
        const baseW = img.width * scaleFit;
        const baseH = img.height * scaleFit;

        // Apply transformations centered
        ctx.translate(C / 2, C / 2);

        // Get actual display width D of container to compute translation scale factor
        const D = containerRef.current?.clientWidth || 320;
        const scaleFactor = C / D;

        ctx.translate(panX * scaleFactor, panY * scaleFactor);
        ctx.scale(zoom, zoom);

        // Draw image centered safely
        ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);

        // Convert canvas back to Base64 image
        const finalDataUrl = canvas.toDataURL('image/png');
        onSelectImage(finalDataUrl);
        onClose();
        resetAll();
      }
    };
  };

  const resetAll = () => {
    setStep('source');
    setCapturedImage(null);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setBgType('transparent');
    setErrorText(null);
    setHasPermission(null);
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-md z-[200] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-600">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">تفريغ ومعالجة خلفية الصورة مجاناً</h3>
              <p className="text-[10px] text-slate-400 font-bold">معالجة فورية وتلقائية داخل جهازك دون استهلاك باقة الإنترنت</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {errorText && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-2xl font-bold flex gap-2 items-start leading-relaxed">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {/* STEP 1: Select Image Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-bold text-center">اختر طريقة تزويد المنتج بالصورة للبدء بالمعالجة الفورية:</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 bg-emerald-50/50 hover:bg-emerald-50 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition group"
                >
                  <div className="w-11 h-11 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition">
                    <Camera size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-800">كاميرا الهاتف 📱</span>
                  <span className="text-[9px] text-slate-400 font-bold">بواسطة الكاميرا الرسمية مباشرة</span>
                </button>

                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 bg-slate-50/50 hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition group"
                >
                  <div className="w-11 h-11 bg-slate-700 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition">
                    <Upload size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-800">الأستوديو / الملفات 📁</span>
                  <span className="text-[9px] text-slate-400 font-bold">اختيار ملف جاهز من جهازك</span>
                </button>
              </div>

              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <input 
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* STEP 2: Webcam Camera Capture */}
          {step === 'camera' && (
            <div className="space-y-4 flex flex-col items-center">
              {hasPermission === null && (
                <div className="w-full max-w-sm aspect-square rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-inner">
                  <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                  <h5 className="text-xs font-black text-slate-800">جاري التحقق من صلاحيات الكاميرا...</h5>
                  <p className="text-[10px] text-slate-400 font-bold leading-normal">يرجى الضغط على "السماح" (Allow) إذا ظهر لك طلب من المتصفح للوصول للكاميرا.</p>
                </div>
              )}

              {hasPermission === false && (
                <div className="w-full max-w-sm aspect-square rounded-3xl bg-rose-50/50 border border-rose-100 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-inner">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                    <ShieldAlert size={24} />
                  </div>
                  <h5 className="text-xs font-black text-slate-800">صلاحية الكاميرا مرفوضة أو غير مدعومة</h5>
                  <p className="text-[10px] text-slate-500 font-bold leading-normal">لم نتمكن من الوصول لعدسة الكاميرا الحية بالمتصفح. يرجى تفعيل الإذن أو استخدام كاميرا الهاتف البديلة المدمجة.</p>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={requestPermissionManually}
                      className="py-2.5 px-5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={14} />
                      <span>إعادة محاولة الكاميرا الحية 🔄</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Camera size={14} />
                      <span>تشغيل كاميرا الهاتف البديلة 📸</span>
                    </button>
                  </div>
                </div>
              )}

              {hasPermission === true && (
                <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-lg border-4 border-slate-100 aspect-square">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/png"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: 'environment' }}
                    onUserMediaError={(err) => {
                      console.error("Webcam media error:", err);
                      setHasPermission(false);
                      setErrorText('لم نتمكن من تشغيل الكاميرا. يرجى التأكد من السماح للتطبيق بالوصول للكاميرا في إعدادات متصفحك أو إعدادات بروفايل التطبيق.');
                    }}
                  />
                  <div className="absolute inset-0 border-2 border-[#9952FF] m-6 rounded-2xl opacity-40 border-dashed pointer-events-none"></div>
                </div>
              )}

              <div className="flex gap-2 w-full max-w-sm font-sans">
                {hasPermission === true && (
                  <button 
                    type="button"
                    onClick={capture}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    <span>التقاط الصورة الآن 📸</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    setStep('source');
                    setErrorText(null);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition flex-1 text-center"
                >
                  رجوع للمصادر
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Camera/Uploaded & Choose Action */}
          {step === 'preview' && capturedImage && (
            <div className="space-y-4 flex flex-col items-center">
              <h4 className="text-xs font-black text-slate-700 text-center">تم التقاط/اختيار الصورة بنجاح! ماذا تريد أن تفعل؟</h4>
              
              <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-slate-100 aspect-square shadow-sm">
                <img src={capturedImage} alt="التقاط" className="w-full h-full object-cover" />
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-3">
                <button
                  type="button"
                  onClick={runBackgroundRemoval}
                  className="p-4 bg-[#9952FF] hover:bg-[#823ce6] text-white border border-violet-400 rounded-2xl flex flex-col items-center text-center gap-2 transition group shadow-md"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Sparkles size={20} className="animate-spin-slow" />
                  </div>
                  <span className="text-xs font-black">تفريغ الخلفية السحري</span>
                  <span className="text-[9px] text-white/80 font-bold">إزالة الخلفية بالذكاء الاصطناعي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectImage(capturedImage);
                    onClose();
                    resetAll();
                  }}
                  className="p-4 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 rounded-2xl flex flex-col items-center text-center gap-2 transition group"
                >
                  <div className="w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center">
                    <Check size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-800">بقاء نفس الصورة كما هي</span>
                  <span className="text-[9px] text-slate-400 font-bold">مواصلة مع الخلفية الطبيعية</span>
                </button>
              </div>

              <button 
                type="button"
                onClick={resetAll}
                className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition"
              >
                <RefreshCw size={12} />
                <span>إعادة التصوير / الالتقاط</span>
              </button>
            </div>
          )}

          {/* STEP 4: Processing State (AI Segmentation) */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-violet-600 animate-pulse">
                  <Sparkles size={24} />
                </div>
              </div>
              <div className="space-y-2 max-w-sm">
                <h4 className="text-sm font-black text-slate-800">جاري تفريغ خلفية الصورة محلياً...</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">{progressText}</p>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[9px] text-amber-700 font-bold leading-normal">
                    💡 يتم تحميل الكود والنموذج في خلفية المتصفح لأول مرة فقط. قد تأخذ هذه الخطوة من 5 لـ 15 ثانية حسب سرعة جهازك، ومن ثم ستصبح فورية ومجانية تماماً بدون إنترنت!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Final Finished Result & Custom Background Setting */}
          {step === 'result' && processedUrl && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-700 text-center">رائع! تم تفريغ الخلفية بنجاح. اختر لون الخلفية المناسب:</h4>
              
              {/* Processed Product Image Canvas Preview inside Chessboard background */}
              <div className="flex flex-col items-center space-y-3">
                <div 
                  ref={containerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative w-full max-w-xs rounded-3xl overflow-hidden shadow-inner aspect-square border-2 border-slate-200 flex items-center justify-center select-none active:cursor-grabbing touch-none"
                  style={{
                    backgroundColor: bgType === 'transparent' ? 'transparent' : bgType === 'white' ? '#FFFFFF' : customColor,
                    backgroundImage: bgType === 'transparent' 
                      ? 'radial-gradient(#cbd5e1 20%, transparent 20%), radial-gradient(#cbd5e1 20%, transparent 20%)' 
                      : 'none',
                    backgroundPosition: '0 0, 8px 8px',
                    backgroundSize: '16px 16px',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                >
                  <img 
                    src={processedUrl} 
                    alt="النتيجة" 
                    className="w-full h-full object-contain p-4 select-none pointer-events-none" 
                    style={{
                      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                  />
                  
                  {/* Subtle crosshair lines */}
                  <div className="absolute inset-4 border border-dashed border-slate-400/10 rounded-2xl pointer-events-none"></div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] border-t border-dashed border-slate-400/10"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-full w-[1px] border-l border-dashed border-slate-400/10"></div>
                  </div>
                </div>

                {/* Info guidance */}
                <p className="text-[10px] text-slate-500 font-bold text-center leading-normal">
                  👈 حرك الصورة بالفأرة/بإصبعك داخل المربع لتعديل موضعها
                </p>

                {/* Zoom / Size Controls & Sliders */}
                <div className="w-full max-w-xs bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                      <Move size={12} className="text-violet-500 animate-pulse" />
                      <span>حجم وموضع الصورة:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1.0);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="text-[10px] font-black text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition"
                    >
                      إعادة ضبط الموضع ↩
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600 shadow-sm"
                    >
                      <ZoomOut size={14} />
                    </button>
                    
                    <input
                      type="range"
                      min="0.4"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600 shadow-sm"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold" dir="ltr">
                    <span>Min 40%</span>
                    <span>Offset: ({Math.round(panX)}, {Math.round(panY)})</span>
                    <span>Max 300%</span>
                  </div>
                </div>
              </div>

              {/* Background Options selection toolbar */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 block">نوع الخلفية المطلوبة للمنتج:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBgType('transparent')}
                    className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${bgType === 'transparent' ? 'bg-[#9952FF] text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <span>شفاف 🏁</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgType('white')}
                    className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${bgType === 'white' ? 'bg-[#9952FF] text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <span>أبيض ناصع ⬜</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgType('custom')}
                    className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${bgType === 'custom' ? 'bg-[#9952FF] text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Palette size={14} />
                    <span>لون مخصص 🎨</span>
                  </button>
                </div>

                {/* Custom Color palette */}
                {bgType === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">اختر لون براندك:</span>
                      <input 
                        type="color" 
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-10 h-7 border border-slate-300 rounded cursor-pointer p-0 bg-transparent flex-shrink-0"
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-200/50 px-2 py-0.5 rounded-lg">{customColor}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {themeColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCustomColor(color)}
                          className="w-5 h-5 rounded-full border border-black/10 transition hover:scale-110 shadow-xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Confirm Toolbar */}
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>تطبيق واعتماد صورة المنتج ✅</span>
                </button>
                
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition"
                >
                  إعادة المعالجة
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
