/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, increment, addDoc, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Reel, Product, Store, Customer } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { useApp } from '../context/useApp';
import { Share } from '@capacitor/share'; // استيراد ميزة مشاركة النظام الرسمية للموبايل
import {
  Film,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Play,
  ChevronLeft,
  ShoppingBag,
  MessageCircle,
  Bookmark,
  MapPin
} from 'lucide-react';

interface ReelsFeedProps {
  onBack?: () => void;
  onShowCart?: () => void;
  cartCount?: number;
  onAddToCart?: (product: Product, qty?: number) => void;
  onVisitStore?: (storeId: string) => void;
  currentCustomer?: Customer | null;
  onShareReel?: (reel: Reel) => void;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  onBack,
  onShowCart,
  cartCount = 0,
  onAddToCart,
  onVisitStore,
  currentCustomer,
  onShareReel
}) => {
  const { toggleFollowStore } = useApp();
  const [reels, setReels] = useState<Reel[]>(() => {
    try {
      const saved = sessionStorage.getItem('reelsState_reels');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('reelsState_reels'));
  const [error, setError] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem('reelsState_activeIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);

  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentCustomer) {
      const likedMap: Record<string, boolean> = {};
      const savedMap: Record<string, boolean> = {};

      (currentCustomer.likedReels || []).forEach(rid => { likedMap[rid] = true; });
      (currentCustomer.savedReels || []).forEach(rid => { savedMap[rid] = true; });

      setLikedReels(likedMap);
      setSavedReels(savedMap);
    } else {
      try {
        const storedLikes = JSON.parse(localStorage.getItem('unregistered_liked_reels') || '[]');
        const storedSaves = JSON.parse(localStorage.getItem('unregistered_saved_reels') || '[]');
        const likedMap: Record<string, boolean> = {};
        const savedMap: Record<string, boolean> = {};
        storedLikes.forEach((rid: string) => { likedMap[rid] = true; });
        storedSaves.forEach((rid: string) => { savedMap[rid] = true; });
        setLikedReels(likedMap);
        setSavedReels(savedMap);
      } catch (e) { console.warn(e); }
    }
  }, [currentCustomer]);

  const [touchStartY, setTouchStartY] = useState(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [lazyProducts, setLazyProducts] = useState<Record<string, Product>>({});
  const [lazyStores, setLazyStores] = useState<Record<string, Store>>({});

  const lazyProductsRef = useRef<Record<string, Product>>({});
  const lazyStoresRef = useRef<Record<string, Store>>({});
  const loadingProductMapRef = useRef<Record<string, boolean>>({});

  const [showComments, setShowComments] = useState(false);
  const [activeComments, setActiveComments] = useState<{ id: string; authorName: string; text: string; createdAt: any }[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const lazyFetchProductAndStore = useCallback(async (reel: Reel, index: number) => {
    const prodId = reel.linkedProductId;
    const storeId = reel.merchantId;

    if (!prodId) return;
    if (lazyProductsRef.current[prodId] || loadingProductMapRef.current[prodId]) return;

    loadingProductMapRef.current[prodId] = true;

    try {
      const prodSnap = await getDoc(doc(db, 'products', prodId));

      if (prodSnap.exists()) {
        const prodData = { id: prodSnap.id, ...prodSnap.data() } as Product;
        lazyProductsRef.current[prodId] = prodData;
        setLazyProducts((prev) => ({ ...prev, [prodId]: prodData }));

        try {
          const viewStorageKey = `viewed_reels_${currentCustomer?.id || 'guest'}`;
          const currentViews = JSON.parse(localStorage.getItem(viewStorageKey) || '[]');
          if (!currentViews.includes(reel.id)) {
            await updateDoc(doc(db, 'reels', reel.id), { viewsCount: increment(1) });
            currentViews.push(reel.id);
            localStorage.setItem(viewStorageKey, JSON.stringify(currentViews));
            setReels(prev => prev.map((r, i) => i === index ? { ...r, viewsCount: (r.viewsCount || 0) + 1 } : r));
          }
        } catch (e) { console.warn("Could not increment reel views: ", e); }
      }

      if (storeId && !lazyStoresRef.current[storeId]) {
        const storeSnap = await getDoc(doc(db, 'stores', storeId));
        if (storeSnap.exists()) {
          const storeData = { id: storeSnap.id, ...storeSnap.data() } as Store;
          lazyStoresRef.current[storeId] = storeData;
          setLazyStores((prev) => ({ ...prev, [storeId]: storeData }));
        }
      }
    } catch (err) {
      console.error(`Error lazy loading Product ID: ${prodId}`, err);
    } finally {
      loadingProductMapRef.current[prodId] = false;
    }
  }, [currentCustomer]);

  const fetchReels = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'reels'));
      const fetchedReels: Reel[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedReels.push({ id: docSnap.id, ...docSnap.data() } as Reel);
      });

      fetchedReels.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setReels(fetchedReels);
      try { sessionStorage.setItem('reelsState_reels', JSON.stringify(fetchedReels)); } catch { /* ignore */ }

      if (isRefresh) {
        setActiveIndex(0);
        try { sessionStorage.setItem('reelsState_activeIndex', '0'); } catch { /* ignore */ }
      }

      const idxToFetch = isRefresh ? 0 : activeIndex;
      if (fetchedReels.length > 0 && fetchedReels[idxToFetch]) {
        lazyFetchProductAndStore(fetchedReels[idxToFetch], idxToFetch);
      }
    } catch (err: any) {
      setError("فشل تحميل المقطع التسوقي. الرجاء التحقق من جودة الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  }, [lazyFetchProductAndStore, activeIndex]);

  useEffect(() => {
    if (reels.length === 0) {
      fetchReels();
    } else if (reels[activeIndex]) {
      lazyFetchProductAndStore(reels[activeIndex], activeIndex);
    }
  }, [fetchReels, reels, activeIndex, lazyFetchProductAndStore]);

  useEffect(() => {
    try { sessionStorage.setItem('reelsState_activeIndex', activeIndex.toString()); } catch { /* ignore */ }
  }, [activeIndex]);

  useEffect(() => {
    if (reels.length > 0 && containerRef.current) {
      const container = containerRef.current;
      const timeoutId = setTimeout(() => {
        const slideHeight = container.clientHeight;
        if (slideHeight > 0 && container.scrollTop !== activeIndex * slideHeight) {
          container.scrollTo({ top: activeIndex * slideHeight, behavior: 'instant' });
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [reels.length, activeIndex]);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const vid = videoRefs.current[idx];
      if (vid) {
        if (idx === activeIndex && playing) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [activeIndex, playing, reels]);

  const handleScroll = () => {
    if (!containerRef.current || reels.length === 0) return;
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const slideHeight = container.clientHeight;
    if (slideHeight <= 0) return;

    // ميزة الفيديوهات بدون نهاية (Infinite Loop): عند تجاوز المقطع الأخير نرجع للأول فوراً بسلاسة
    if (scrollPosition + slideHeight >= container.scrollHeight - 5) {
      setActiveIndex(0);
      container.scrollTo({ top: 0, behavior: 'instant' });
      lazyFetchProductAndStore(reels[0], 0);
      return;
    }

    const newIndex = Math.round(scrollPosition / slideHeight);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
      setActiveIndex(newIndex);
      setPlaying(true);
      setShowComments(false);
      lazyFetchProductAndStore(reels[newIndex], newIndex);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartY || isRefreshing) return;
    const pullDistance = Math.max(0, e.touches[0].clientY - touchStartY);
    if (containerRef.current && containerRef.current.scrollTop === 0 && pullDistance > 0) {
      setPullProgress(Math.min(pullDistance, 100));
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullProgress > 80 && !isRefreshing) {
      setIsRefreshing(true);
      setPullProgress(0);
      await fetchReels(true);
      setIsRefreshing(false);
    } else {
      setPullProgress(0);
    }
    setTouchStartY(0);
  };

  const handleLikeReel = async (index: number) => {
    const reel = reels[index];
    const isLiked = likedReels[reel.id];
    try {
      await updateDoc(doc(db, 'reels', reel.id), { likesCount: increment(isLiked ? -1 : 1) });
      setLikedReels(prev => ({ ...prev, [reel.id]: !isLiked }));
      setReels(prev => prev.map((r, i) => i === index ? { ...r, likesCount: Math.max(0, (r.likesCount || 0) + (isLiked ? -1 : 1)) } : r));

      if (currentCustomer) {
        await updateDoc(doc(db, 'customers', currentCustomer.id), {
          likedReels: isLiked ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
      } else {
        const storedLikes = JSON.parse(localStorage.getItem('unregistered_liked_reels') || '[]');
        localStorage.setItem('unregistered_liked_reels', JSON.stringify(isLiked ? storedLikes.filter((id: string) => id !== reel.id) : [...storedLikes, reel.id]));
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleBookmark = async (index: number) => {
    const reel = reels[index];
    const isSaved = savedReels[reel.id];
    try {
      await updateDoc(doc(db, 'reels', reel.id), { savesCount: increment(isSaved ? -1 : 1) });
      setSavedReels(prev => ({ ...prev, [reel.id]: !isSaved }));
      setReels(prev => prev.map((r, i) => i === index ? { ...r, savesCount: Math.max(0, (r.savesCount || 0) + (isSaved ? -1 : 1)) } : r));

      if (currentCustomer) {
        await updateDoc(doc(db, 'customers', currentCustomer.id), {
          savedReels: isSaved ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
      } else {
        const storedSaves = JSON.parse(localStorage.getItem('unregistered_saved_reels') || '[]');
        localStorage.setItem('unregistered_saved_reels', JSON.stringify(isSaved ? storedSaves.filter((id: string) => id !== reel.id) : [...storedSaves, reel.id]));
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleFollow = (storeId: string) => {
    if (!currentCustomer) {
      alert('يرجى تسجيل الدخول لمتابعة المتجر');
      return;
    }
    toggleFollowStore(currentCustomer.id, storeId);
  };

  // 🔥 ميزة الـ Native Share Sheet الكبرى: استدعاء واجهة مشاركة النظام الأصلية للموبايل لفتح واتساب وباقي التطبيقات مباشرة كودياً
  const handleShareReel = async (index: number) => {
    const reel = reels[index];
    const store = lazyStores[reel.merchantId];
    const shopName = store ? store.shopName : 'متجر مميز';

    try {
      // استدعاء نظام كاباسيتور الأصلي لفتح الـ Share Sheet الخاص بالآيفون والأندرويد مباشرة
      await Share.share({
        title: `مشاركة مقطع من متجر ${shopName}`,
        text: `شاهد هذا المنتج المذهل من متجر (${shopName}) على تطبيق محلك! 🎬🛍️`,
        url: reel.videoUrl,
        dialogTitle: 'مشاركة المقطع التسوقي عبر تطبيقات الموبايل',
      });

      // زيادة عداد المشاركات في الفايربيس للريل
      await updateDoc(doc(db, 'reels', reel.id), { sharesCount: increment(1) });
      setReels(prev => prev.map((r, i) => i === index ? { ...r, sharesCount: (r.sharesCount || 0) + 1 } : r));

      // كسب 5 نقاط تلقائية للزبون المسجل
      if (currentCustomer) {
        await updateDoc(doc(db, 'customers', currentCustomer.id), { points: increment(5) });
        alert('شكراً لك على مشاركة المقطع! تم منحك 5 نقاط إضافية في محفظتك 🎉');
      }

    } catch (err) {
      console.warn("Native share sheets issue or cancelled: ", err);
      // خطة احتياطية للـ Web والـ Browsers العادية
      try {
        await navigator.clipboard.writeText(reel.videoUrl);
        alert('تم نسخ رابط فيديو المنتج بنجاح لمشاركته! 🔗');
      } catch (clipErr) { console.error(clipErr); }
    }
  };

  const handleVideoTimeUpdate = (index: number, e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (index !== activeIndex) return;
    const video = e.currentTarget;
    setVideoProgress(prev => ({ ...prev, [index]: (video.currentTime / video.duration) * 100 || 0 }));
  };

  const handleLoadCommentsForReel = async (reelId: string) => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const q = query(collection(db, 'reel_comments'), where('reelId', '==', reelId));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => { list.push({ id: d.id, ...d.data() }); });
      list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setActiveComments(list);
    } catch (err) { console.error(err); }
    finally { setLoadingComments(false); }
  };

  const handleAddComment = async (reelId: string, index: number) => {
    if (!newCommentText.trim()) return;
    const authorName = currentCustomer?.name || 'مشتري مهتم';
    try {
      const commentDoc = {
        reelId,
        authorName,
        text: newCommentText.trim(),
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      await addDoc(collection(db, 'reel_comments'), commentDoc);
      await updateDoc(doc(db, 'reels', reelId), { commentsCount: increment(1) });

      setNewCommentText('');
      setActiveComments(prev => [commentDoc as any, ...prev]);
      setReels(prev => prev.map((r, i) => i === index ? { ...r, commentsCount: (r.commentsCount || 0) + 1 } : r));
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-black" dir="rtl">
        <Loader2 className="animate-spin text-[#9952FF] mb-4" size={40} />
        <p className="text-sm font-black text-slate-400 font-tajawal">جاري تجهيز صالة العرض ومقاطع الفيديوهات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center space-y-4 bg-black" dir="rtl">
        <div className="w-14 h-14 rounded-full bg-rose-950 text-rose-500 flex items-center justify-center">
          <AlertCircle size={28} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-200 font-tajawal">عذراً، فشل تحميل صالة العرض</h4>
          <p className="text-xs text-slate-400 mt-1 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen absolute inset-0 bg-black select-none flex flex-col justify-between overflow-hidden transform-gpu backface-hidden p-0 m-0" dir="rtl">

      {/* البار العلوي */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 flex items-center justify-between px-4 text-white font-tajawal">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition active:scale-95"
        >
          <ChevronLeft size={24} className="text-white shrink-0" />
        </button>

        <h1 className="text-lg font-black tracking-tight text-white drop-shadow">Reels</h1>

        <button
          onClick={onShowCart}
          className="w-10 h-10 rounded-full bg-[#9952FF] text-white flex items-center justify-center hover:bg-[#853df2] transition active:scale-95 shadow-lg relative"
        >
          <ShoppingBag size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border border-white animate-pulse">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* حاوية الـ Snapping اللانهائية لملء الشاشة بالكامل ومنع الفراغ الأسود */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth flex flex-col no-scrollbar transform-gpu p-0 m-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', willChange: 'transform' }}
      >
        {reels.map((reel, index) => {
          const product = lazyProducts[reel.linkedProductId];
          const store = lazyStores[reel.merchantId];
          const isLiked = likedReels[reel.id];
          const isSaved = savedReels[reel.id];
          const isFollowed = currentCustomer?.followedStores?.includes(reel.merchantId) || false;
          const progressPercent = videoProgress[index] || 0;

          const isCurrentActive = index === activeIndex;

          return (
            <div
              key={reel.id + '-' + index}
              className="w-full h-full h-screen snap-start snap-always relative shrink-0 overflow-hidden flex items-center justify-center transform-gpu p-0 m-0 bg-black"
            >
              {isCurrentActive ? (
                <video
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={reel.videoUrl}
                  loop
                  playsInline
                  autoPlay
                  muted={muted}
                  preload="auto"
                  onTimeUpdate={(e) => handleVideoTimeUpdate(index, e)}
                  onClick={() => setPlaying(!playing)}
                  className="absolute inset-0 w-full h-full object-cover z-0 transform-gpu will-change-transform p-0 m-0 block"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-neutral-950 flex flex-col items-center justify-center gap-2 text-slate-700 z-0 p-0 m-0">
                  <Film size={36} className="animate-pulse text-neutral-800" />
                </div>
              )}

              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none">
                  <div className="w-15 h-15 rounded-full bg-slate-900/60 backdrop-blur-md text-white flex items-center justify-center animate-ping">
                    <Play size={24} />
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/60 pointer-events-none z-10" />

              {/* التحكم بالصوت */}
              <div className="absolute top-20 left-4 z-25">
                <button
                  onClick={() => setMuted(!muted)}
                  className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition active:scale-95"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* شريط الإجراءات الجانبي */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center gap-3 z-25">

                {/* لوجو المحل وزر المتابعة */}
                <div className="relative mb-2 flex flex-col items-center">
                  <div onClick={() => onVisitStore?.(reel.merchantId)} className="w-12 h-12 rounded-full p-[2px] bg-white border border-slate-900 overflow-hidden shadow-lg relative cursor-pointer hover:scale-105 transition">
                    {store?.logo ? (
                      <img src={store.logo} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-[#9952FF] text-white flex items-center justify-center font-black text-xs">M</div>
                    )}
                  </div>

                  {store && (store.isVerified || (store as any).is_verified) && (
                    <div className="absolute -bottom-1 left-0 z-10 drop-shadow-md">
                      <VerifiedBadge size={13} />
                    </div>
                  )}

                  {!isFollowed && (
                    <button
                      onClick={() => handleToggleFollow(reel.merchantId)}
                      className="absolute -bottom-2 w-9 h-4 bg-rose-500 rounded-full border border-white text-white flex items-center justify-center font-black shadow-md hover:bg-rose-600 transition"
                      style={{ fontSize: '8px' }}
                    >
                      متابعة
                    </button>
                  )}
                </div>

                {/* زر الإعجاب */}
                <button onClick={() => handleLikeReel(index)} className="flex flex-col items-center group font-tajawal cursor-pointer">
                  <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 ${
                    isLiked ? 'bg-rose-500/20 text-rose-500' : 'bg-black/35 text-white border border-white/10'
                  }`}>
                    <Heart size={20} className={isLiked ? "fill-current animate-pulse" : ""} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 font-mono">{(reel.likesCount || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">أعجبني</span>
                </button>

                {/* زر التعليقات */}
                <button onClick={() => handleLoadCommentsForReel(reel.id)} className="flex flex-col items-center group font-tajawal cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg transition">
                    <MessageCircle size={20} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 font-mono">{(reel.commentsCount || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">تعليق</span>
                </button>

                {/* زر المشاركة المدعوم بالـ Native Share Sheet الأصلي للجهاز */}
                <button onClick={() => handleShareReel(index)} className="flex flex-col items-center group font-tajawal cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg transition">
                    <Share2 size={20} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 font-mono">{(reel.sharesCount || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">مشاركة</span>
                </button>

                {/* زر الحفظ */}
                <button onClick={() => handleToggleBookmark(index)} className="flex flex-col items-center group font-tajawal cursor-pointer">
                  <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 ${
                    isSaved ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/35 text-white border border-white/10'
                  }`}>
                    <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 font-mono">{(reel.savesCount || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">حفظ</span>
                </button>

              </div>

              {/* البطاقة السفلية */}
              <div className="absolute bottom-8 left-4 right-20 z-30 font-tajawal">
                <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl text-white space-y-3">

                  {/* معلومات المتجر والمحافظة */}
                  {store && (
                    <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                      <div className="w-8 h-8 rounded-full p-[1px] bg-white overflow-hidden shadow">
                        {store.logo ? (
                          <img src={store.logo} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full bg-[#9952FF] text-white flex items-center justify-center font-black text-[10px]">M</div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white flex items-center gap-1">
                          {store.shopName}
                          {(store.isVerified || (store as any).is_verified) && <VerifiedBadge size={12} />}
                        </span>

                        <span className="text-[9px] text-slate-300 flex items-center gap-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          {store.province || 'العراق'} {store.area ? `- ${store.area}` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* تفاصيل المنتج والسعر والزر البنفسجي */}
                  {product ? (
                    <>
                      <div>
                        <p className="text-xs font-bold text-slate-100 line-clamp-1 leading-tight mb-1.5">
                          {product.name}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">
                            {(product.finalPrice || product.price).toLocaleString()} د.ع
                          </span>

                          {product.price > (product.finalPrice || product.price) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 line-through font-bold">
                                {product.price.toLocaleString()} د.ع
                              </span>
                              <span className="text-rose-400 text-[9px] font-black bg-rose-500/10 px-1.5 py-0.5 rounded">
                                خصم ({Math.round(((product.price - product.finalPrice) / product.price) * 100)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddToCart) {
                            onAddToCart(product, 1);
                          } else {
                            alert(`تم إضافة ${product.name} للسلة`);
                          }
                        }}
                        className="w-full py-2.5 bg-[#9952FF] hover:bg-[#853df2] active:scale-[0.97] transition text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#9952FF]/20 cursor-pointer"
                      >
                        <ShoppingBag size={15} />
                        <span>إضافة إلى السلة</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <Loader2 size={13} className="animate-spin text-purple-400" />
                      <span className="text-[10px] font-bold text-slate-400">جاري مزامنة بيانات المنتج...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* شريط التقدم الأسفل */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const vid = videoRefs.current[index];
                  if (vid && isFinite(vid.duration)) {
                    vid.currentTime = ((e.clientX - rect.left) / rect.width) * vid.duration;
                  }
                }}
                className="absolute bottom-2 inset-x-0 h-4 z-35 cursor-pointer flex items-center select-none"
              >
                <div className="w-full h-[3px] bg-white/20 relative">
                  <div className="h-full bg-white relative" style={{ width: `${progressPercent}%` }}>
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md" />
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* شيت التعليقات الصاعد */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[#0B0D17] border-t border-white/10 rounded-t-3xl z-50 flex flex-col font-tajawal shadow-2xl overflow-hidden text-white animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-black text-sm flex items-center gap-1.5">
              <span>التعليقات</span>
              <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                {activeComments.length}
              </span>
            </h3>
            <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white p-1 text-sm font-bold">
              إغلاق ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {activeComments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-1">
                <MessageCircle size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold">لا توجد تعليقات بعد لهذا المقطع</p>
              </div>
            ) : (
              activeComments.map((comment, i) => (
                <div key={comment.id + '-' + i} className="bg-white/5 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#A78BFA] font-black">
                    <span>{comment.authorName}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 leading-relaxed text-right pr-1">
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-black/80 border-t border-white/5 flex gap-2 items-center">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="اكتب تعليقاً حقيقياً..."
              className="flex-1 bg-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none placeholder-slate-500 text-right pr-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment(reels[activeIndex].id, activeIndex);
                }
              }}
            />
            <button
              onClick={() => handleAddComment(reels[activeIndex].id, activeIndex)}
              disabled={!newCommentText.trim()}
              className="bg-[#9952FF] disabled:bg-slate-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl"
            >
              إرسال
            </button>
          </div>
        </div>
      )}

    </div>
  );
};