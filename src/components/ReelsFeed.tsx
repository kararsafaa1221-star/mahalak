/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, increment, addDoc, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Reel, Product, Store, Customer } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { useApp } from '../context/useApp';
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
  Plus 
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
  
  // Active state
  const [activeIndex, setActiveIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem('reelsState_activeIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);

  // Video progress for seekbar (index => progress percentage)
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});

  // Interaction local storage/state toggles
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Record<string, boolean>>({});

  // Sync with currentCustomer or LocalStorage on mount/update
  useEffect(() => {
    if (currentCustomer) {
      const likedMap: Record<string, boolean> = {};
      const savedMap: Record<string, boolean> = {};
      
      (currentCustomer.likedReels || []).forEach(rid => {
        likedMap[rid] = true;
      });
      (currentCustomer.savedReels || []).forEach(rid => {
        savedMap[rid] = true;
      });
      
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
      } catch (e) {
        console.warn(e);
      }
    }
  }, [currentCustomer]);

  // Pull to Refresh State
  const [touchStartY, setTouchStartY] = useState(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lazy Loaded Data Maps
  const [lazyProducts, setLazyProducts] = useState<Record<string, Product>>({});
  const [lazyStores, setLazyStores] = useState<Record<string, Store>>({});

  const lazyProductsRef = useRef<Record<string, Product>>({});
  const lazyStoresRef = useRef<Record<string, Store>>({});
  const loadingProductMapRef = useRef<Record<string, boolean>>({});

  // Comments Sheet State
  const [showComments, setShowComments] = useState(false);
  const [activeComments, setActiveComments] = useState<{ id: string; authorName: string; text: string; createdAt: any }[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Lazy fetch product details AND store details for active reel index
  const lazyFetchProductAndStore = useCallback(async (reel: Reel, index: number) => {
    const prodId = reel.linkedProductId;
    const storeId = reel.merchantId;

    if (!prodId) return;

    if (lazyProductsRef.current[prodId] || loadingProductMapRef.current[prodId]) return;

    loadingProductMapRef.current[prodId] = true;

    try {
      const prodDocRef = doc(db, 'products', prodId);
      const prodSnap = await getDoc(prodDocRef);

      if (prodSnap.exists()) {
        const prodData = { id: prodSnap.id, ...prodSnap.data() } as Product;
        lazyProductsRef.current[prodId] = prodData;
        setLazyProducts((prev) => ({ ...prev, [prodId]: prodData }));

        // Increment Views Count - Strict single view per guest/customer
        try {
          const viewStorageKey = `viewed_reels_${currentCustomer?.id || 'guest'}`;
          const currentViews = JSON.parse(localStorage.getItem(viewStorageKey) || '[]');
          if (!currentViews.includes(reel.id)) {
            const reelDocRef = doc(db, 'reels', reel.id);
            await updateDoc(reelDocRef, { viewsCount: increment(1) });
            currentViews.push(reel.id);
            localStorage.setItem(viewStorageKey, JSON.stringify(currentViews));
            setReels(prev => prev.map((r, i) => i === index ? { ...r, viewsCount: (r.viewsCount || 0) + 1 } : r));
          }
        } catch (e) {
          console.warn("Could not increment reel views: ", e);
        }
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

  // Fetch Reels
  const fetchReels = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const reelsRef = collection(db, 'reels');
      const querySnapshot = await getDocs(reelsRef);
      
      const fetchedReels: Reel[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedReels.push({ id: docSnap.id, ...docSnap.data() } as Reel);
      });

      // Sort descending by creation date safely
      fetchedReels.sort((a,b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setReels(fetchedReels);
      try {
        sessionStorage.setItem('reelsState_reels', JSON.stringify(fetchedReels));
      } catch (_e) {
        console.warn('Failed to cache reels: ', _e);
      }
      
      if (isRefresh) {
        setActiveIndex(0);
        try {
          sessionStorage.setItem('reelsState_activeIndex', '0');
        } catch (_e) {
          // ignore
        }
      }
      
      const idxToFetch = isRefresh ? 0 : activeIndex;
      if (fetchedReels.length > 0 && fetchedReels[idxToFetch]) {
        lazyFetchProductAndStore(fetchedReels[idxToFetch], idxToFetch);
      }
    } catch (err: any) {
      console.error("Error loading reels feed:", err);
      setError("فشل تحميل المقطع التسوقي. الرجاء التحقق من جودة الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  }, [lazyFetchProductAndStore, activeIndex]);

  useEffect(() => {
    if (reels.length === 0) {
      fetchReels();
    } else {
      if (reels[activeIndex]) {
        lazyFetchProductAndStore(reels[activeIndex], activeIndex);
      }
    }
  }, [fetchReels, reels, activeIndex, lazyFetchProductAndStore]); // Run when reels/activeIndex changes to fetch store data

  // Handle activeIndex updates in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('reelsState_activeIndex', activeIndex.toString());
    } catch (_e) {
      // ignore
    }
  }, [activeIndex]);

  // Initial scroll to active index
  useEffect(() => {
    if (reels.length > 0 && containerRef.current) {
      const container = containerRef.current;
      // Use small timeout to ensure DOM layout is completely ready for slideHeight calculation
      const timeoutId = setTimeout(() => {
        const slideHeight = container.clientHeight;
        if (slideHeight > 0 && container.scrollTop !== activeIndex * slideHeight) {
          container.scrollTo({ top: activeIndex * slideHeight, behavior: 'instant' });
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [reels.length, activeIndex]);

  // Play/Pause current video
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const vid = videoRefs.current[idx];
      if (vid) {
        if (idx === activeIndex && playing) {
          vid.play().catch((err) => {
            console.warn("Autoplay block: ", err);
          });
        } else {
          vid.pause();
        }
      }
    });
  }, [activeIndex, playing, reels]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const slideHeight = container.clientHeight;

    const newIndex = Math.round(scrollPosition / slideHeight);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
      setActiveIndex(newIndex);
      setPlaying(true);
      setShowComments(false); // Close comments on swipe
      
      const activeReel = reels[newIndex];
      lazyFetchProductAndStore(activeReel, newIndex);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartY || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const pullDistance = Math.max(0, touchY - touchStartY);
    
    // Only allow pulling down if we are at the top
    if (containerRef.current && containerRef.current.scrollTop === 0 && pullDistance > 0) {
      const progress = Math.min(pullDistance, 100);
      setPullProgress(progress);
      
      if (e.cancelable) {
        e.preventDefault();
      }
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
      const reelDocRef = doc(db, 'reels', reel.id);
      await updateDoc(reelDocRef, { 
        likesCount: increment(isLiked ? -1 : 1) 
      });
      
      setLikedReels(prev => ({ ...prev, [reel.id]: !isLiked }));
      setReels(prev => prev.map((r, i) => i === index ? { ...r, likesCount: Math.max(0, (r.likesCount || 0) + (isLiked ? -1 : 1)) } : r));

      if (currentCustomer) {
        const customerRef = doc(db, 'customers', currentCustomer.id);
        await updateDoc(customerRef, {
          likedReels: isLiked ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
        if (currentCustomer.likedReels) {
          if (isLiked) {
            currentCustomer.likedReels = currentCustomer.likedReels.filter(id => id !== reel.id);
          } else {
            currentCustomer.likedReels = [...currentCustomer.likedReels, reel.id];
          }
        } else {
          currentCustomer.likedReels = isLiked ? [] : [reel.id];
        }
      } else {
        const storedLikes = JSON.parse(localStorage.getItem('unregistered_liked_reels') || '[]');
        const newLikes = isLiked ? storedLikes.filter((id: string) => id !== reel.id) : [...storedLikes, reel.id];
        localStorage.setItem('unregistered_liked_reels', JSON.stringify(newLikes));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBookmark = async (index: number) => {
    const reel = reels[index];
    const isSaved = savedReels[reel.id];

    try {
      const reelDocRef = doc(db, 'reels', reel.id);
      await updateDoc(reelDocRef, { 
        savesCount: increment(isSaved ? -1 : 1) 
      });
      
      setSavedReels(prev => ({ ...prev, [reel.id]: !isSaved }));
      setReels(prev => prev.map((r, i) => i === index ? { ...r, savesCount: Math.max(0, (r.savesCount || 0) + (isSaved ? -1 : 1)) } : r));

      if (currentCustomer) {
        const customerRef = doc(db, 'customers', currentCustomer.id);
        await updateDoc(customerRef, {
          savedReels: isSaved ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
        if (currentCustomer.savedReels) {
          if (isSaved) {
            currentCustomer.savedReels = currentCustomer.savedReels.filter(id => id !== reel.id);
          } else {
            currentCustomer.savedReels = [...currentCustomer.savedReels, reel.id];
          }
        } else {
          currentCustomer.savedReels = isSaved ? [] : [reel.id];
        }
      } else {
        const storedSaves = JSON.parse(localStorage.getItem('unregistered_saved_reels') || '[]');
        const newSaves = isSaved ? storedSaves.filter((id: string) => id !== reel.id) : [...storedSaves, reel.id];
        localStorage.setItem('unregistered_saved_reels', JSON.stringify(newSaves));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFollow = (storeId: string) => {
    if (!currentCustomer) {
      alert('يرجى تسجيل الدخول لمتابعة المتجر');
      return;
    }
    toggleFollowStore(currentCustomer.id, storeId);
  };

  const handleShareReel = async (index: number) => {
    const reel = reels[index];
    try {
      if (onShareReel) {
        onShareReel(reel);
      } else {
        await navigator.clipboard.writeText(reel.videoUrl);
        alert('تم نسخ رابط الفيديو لمشاركته! 🔗🎬');
      }

      const reelDocRef = doc(db, 'reels', reel.id);
      await updateDoc(reelDocRef, { 
        sharesCount: increment(1) 
      });
      setReels(prev => prev.map((r, i) => i === index ? { ...r, sharesCount: (r.sharesCount || 0) + 1 } : r));
    } catch (err) {
      console.warn("Could not copy link or show share sheet: ", err);
    }
  };

  const handleVideoTimeUpdate = (index: number, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const progress = (video.currentTime / video.duration) * 100 || 0;
    setVideoProgress(prev => ({
      ...prev,
      [index]: progress
    }));
  };

  // Real Comments Flow
  const handleLoadCommentsForReel = async (reelId: string) => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const commentsRef = collection(db, 'reel_comments');
      const q = query(commentsRef, where('reelId', '==', reelId));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setActiveComments(list);
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoadingComments(false);
    }
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
      
      const commentsRef = collection(db, 'reel_comments');
      await addDoc(commentsRef, commentDoc);

      const reelDocRef = doc(db, 'reels', reelId);
      await updateDoc(reelDocRef, { 
        commentsCount: increment(1) 
      });

      // Update state locally
      setNewCommentText('');
      setActiveComments(prev => [commentDoc as any, ...prev]);
      setReels(prev => prev.map((r, i) => i === index ? { ...r, commentsCount: (r.commentsCount || 0) + 1 } : r));
    } catch (err) {
      console.error("Error adding comment:", err);
    }
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

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4 bg-black" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-[#9952FF]/5 text-[#9952FF] flex items-center justify-center">
          <Film size={40} className="animate-pulse" />
        </div>
        <div className="space-y-1 text-center">
          <h3 className="text-base font-black text-slate-200 font-tajawal">لا توجد مقاطع ريلز منشورة حالياً</h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm">سنعرض فيديوهات تسوقية مذهلة هنا قريباً لمنتجات المتاجر العراقية لتقوم بالشراء بلمسة واحدة!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-black select-none flex flex-col justify-between overflow-hidden" dir="rtl">
      
      {/* 1. Header Row (Top bar - exact mockup) */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 flex items-center justify-between px-4 text-white font-tajawal">
        {/* Back Button (Left) */}
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition active:scale-95"
          title="رجوع للمتجر"
        >
          <ChevronLeft size={24} className="text-white shrink-0" />
        </button>

        {/* Title Reels (Center) */}
        <h1 className="text-lg font-black tracking-tight text-white drop-shadow">Reels</h1>

        {/* Shopping Cart button with Badge (Right) */}
        <button 
          onClick={onShowCart}
          className="w-10 h-10 rounded-full bg-[#9952FF] text-white flex items-center justify-center hover:bg-[#853df2] transition active:scale-95 shadow-lg relative"
          title="السلة"
        >
          <ShoppingBag size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border border-white animate-pulse">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Pull to refresh visual indicator */}
      {pullProgress > 0 && (
        <div 
          className="absolute top-16 left-0 right-0 flex justify-center z-30 pointer-events-none"
          style={{ transform: `translateY(${pullProgress * 0.5}px)` }}
        >
          <div className="bg-white/20 backdrop-blur-md rounded-full p-2 shadow-lg flex items-center justify-center">
            {isRefreshing ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ChevronLeft size={24} className="-rotate-90 text-white" style={{ transform: `rotate(-90deg) scale(${Math.min(1, pullProgress / 60)})`, opacity: pullProgress / 100 }} />
            )}
          </div>
        </div>
      )}

      {/* 2. Main snap container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth flex flex-col no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', transform: `translateY(${pullProgress * 0.3}px)` }}
      >
        {reels.map((reel, index) => {
          const product = lazyProducts[reel.linkedProductId];
          const store = lazyStores[reel.merchantId];
          const isLiked = likedReels[reel.id];
          const isSaved = savedReels[reel.id];
          const isFollowed = currentCustomer?.followedStores?.includes(reel.merchantId) || false;
          const progressPercent = videoProgress[index] || 0;

          // FAST Lazy Loading and Preloading Optimization
          // Only mount videos that are currently visible, or immediately previous/next
          const shouldRenderVideo = index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1;

          // Display REAL database metrics with a clean fallback to 0
          const likesCount = reel.likesCount || 0;
          const commentsCount = reel.commentsCount || 0;
          const sharesCount = reel.sharesCount || 0;
          const bookmarksCount = reel.savesCount || 0;

          return (
            <div 
              key={reel.id + '-' + index}
              className="w-full h-full snap-start snap-always relative shrink-0 overflow-hidden flex items-center justify-center"
            >
              {/* Backing Video Player optimized for performance */}
              {shouldRenderVideo ? (
                <video
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={reel.videoUrl}
                  loop
                  playsInline
                  autoPlay={index === 0}
                  muted={muted}
                  preload={index === activeIndex ? "auto" : "metadata"}
                  onTimeUpdate={(e) => handleVideoTimeUpdate(index, e)}
                  onClick={() => setPlaying(!playing)}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 text-slate-500 z-0">
                  <Film size={40} className="animate-pulse text-slate-800" />
                  <span className="text-[10px] font-tajawal text-slate-600">جاري التحضير...</span>
                </div>
              )}

              {/* Pause/Play indicator */}
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-slate-900/60 backdrop-blur-md text-white flex items-center justify-center animate-ping">
                    <Play size={28} className="translate-x-[-2px]" />
                  </div>
                </div>
              )}

              {/* Dark Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none z-10" />

              {/* Middle Top Actions Overlay: Merchant Capsule & Mute Button */}
              <div className="absolute top-20 inset-x-0 px-4 flex justify-end items-center z-25 font-tajawal">
                
                {/* 2b. Mute toggle button (Right) - Shrunk */}
                <button 
                  onClick={() => setMuted(!muted)}
                  className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition active:scale-95"
                  title={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* 3. Right Sidebar action list (TikTok Style Mockup) */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center gap-2.5 z-25">
                
                {/* Store image capsule with store navigation */}
                <div className="relative mb-2 flex flex-col items-center">
                  <div 
                    onClick={() => onVisitStore?.(reel.merchantId)}
                    className="relative cursor-pointer hover:scale-110 active:scale-95 transition group"
                    title="الذهاب لصفحة المتجر"
                  >
                    <div className="w-12 h-12 rounded-full p-[2px] bg-white border border-slate-800 overflow-hidden shadow-lg relative">
                      {store?.logo ? (
                        <img src={store.logo} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-[#9952FF] text-white flex items-center justify-center font-black text-xs">M</div>
                      )}
                    </div>
                  </div>
                  
                  {store && (store.isVerified || (store as any).is_verified) && (
                    <div className="absolute -bottom-1 left-0 z-10 drop-shadow-md">
                      <VerifiedBadge size={14} />
                    </div>
                  )}

                  {!isFollowed && (
                    <button 
                      onClick={() => handleToggleFollow(reel.merchantId)}
                      className="absolute -bottom-3 w-10 h-5 bg-rose-500 rounded-full border border-white text-white flex items-center justify-center font-bold shadow-md hover:bg-rose-600 transition tracking-tighter"
                      style={{ fontSize: '9px' }}
                    >
                      متابعة
                    </button>
                  )}
                </div>

                {/* HEART (Like) - REAL value */}
                <button 
                  onClick={() => handleLikeReel(index)}
                  className="flex flex-col items-center group font-tajawal cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 group-hover:scale-110 active:scale-95 ${
                    isLiked ? 'bg-rose-500/20 text-rose-500' : 'bg-black/35 text-white border border-white/10'
                  }`}>
                    <Heart size={21} className={isLiked ? "fill-current animate-pulse" : ""} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 drop-shadow-sm font-mono">{likesCount.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">أعجبني</span>
                </button>

                {/* COMMENTS - REAL value */}
                <button 
                  onClick={() => handleLoadCommentsForReel(reel.id)}
                  className="flex flex-col items-center group font-tajawal cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg transition group-hover:scale-110">
                    <MessageCircle size={21} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 drop-shadow-sm font-mono">{commentsCount.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">تعليق</span>
                </button>

                {/* SHARE - REAL value */}
                <button 
                  onClick={() => handleShareReel(index)}
                  className="flex flex-col items-center group font-tajawal cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg transition group-hover:scale-110">
                    <Share2 size={21} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 drop-shadow-sm font-mono">{sharesCount.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">مشاركة</span>
                </button>

                {/* BOOKMARK (SAVE) - REAL value */}
                <button 
                  onClick={() => handleToggleBookmark(index)}
                  className="flex flex-col items-center group font-tajawal cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 group-hover:scale-110 active:scale-95 ${
                    isSaved ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/35 text-white border border-white/10'
                  }`}>
                    <Bookmark size={21} className={isSaved ? "fill-current" : ""} />
                  </div>
                  <span className="text-[10px] text-slate-200 font-extrabold mt-1 drop-shadow-sm font-mono">{bookmarksCount.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-300 font-bold opacity-80 mt-0.5">حفظ</span>
                </button>

              </div>

              {/* 4. Bottom left Translucent Product Card Panel (Mocked properly) */}
              <div className="absolute bottom-8 left-4 right-20 z-30 font-tajawal">
                {product ? (
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl text-white space-y-3.5">
                    {/* Upper layout details */}
                    <div>
                      <p className="text-[11px] font-medium text-slate-200 truncate leading-none mb-1.5">
                        <strong className="text-slate-350">اسم المنتج:</strong> {product.name}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-2">
                        <strong className="text-slate-350 text-xs">السعر:</strong>
                        <span className="text-xs sm:text-sm font-black text-white">
                          {(product.finalPrice || product.price).toLocaleString()} د.ع
                        </span>
                        
                        {product.price > (product.finalPrice || product.price) && (
                          <div className="flex items-center gap-1.5 mr-2">
                            <span className="text-[10px] text-slate-400 line-through font-bold">
                              {product.price.toLocaleString()} د.ع
                            </span>
                            <span className="text-rose-400 text-[10px] font-black bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                              خصم ({Math.round(((product.price - product.finalPrice) / product.price) * 100)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive ADD-TO-CART button exactly matching the mockup */}
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
                  </div>
                ) : (
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white flex items-center justify-center gap-2.5">
                    <Loader2 size={15} className="animate-spin text-amber-500" />
                    <span className="text-xs font-bold font-tajawal">جاري تحديث الصفحة</span>
                  </div>
                )}
              </div>

              {/* 5. Horizontal seek progress bar running across the full viewport bottom (Interactive click-to-seek timeline) */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const progressPct = clickX / rect.width;
                  const vid = videoRefs.current[index];
                  if (vid && isFinite(vid.duration)) {
                    vid.currentTime = progressPct * vid.duration;
                  }
                }}
                className="absolute bottom-2 inset-x-0 h-4 z-35 cursor-pointer flex items-center select-none"
              >
                <div className="w-full h-[4px] bg-white/20 relative">
                  <div 
                    className="h-full bg-white relative transition-all duration-75"
                    style={{ width: `${progressPercent}%` }}
                  >
                    {/* Progress cursor middle thumb handle exactly like mockup */}
                    <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md shadow-black/80 ring-2 ring-white/15 cursor-grab active:cursor-grabbing" />
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 6. Comments Slide-up Sheet (Real interactive comments collection) */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[#0B0D17] border-t border-white/10 rounded-t-3xl z-50 flex flex-col font-tajawal shadow-2xl overflow-hidden text-white animate-slide-up">
          {/* Header bar */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-black text-sm flex items-center gap-1.5">
              <span>التعليقات الحقيقية التفاعلية</span>
              <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                {activeComments.length}
              </span>
            </h3>
            <button 
              onClick={() => setShowComments(false)}
              className="text-slate-400 hover:text-white p-1 text-sm font-bold"
            >
              إغلاق ×
            </button>
          </div>

          {/* List of comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {loadingComments ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="animate-spin text-[#9952FF]" size={20} />
                <span className="text-xs text-slate-400">جاري تحميل تعليقات المشترين...</span>
              </div>
            ) : activeComments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-1">
                <MessageCircle size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold">لا توجد تعليقات بعد لهذا المقطع</p>
                <p className="text-[10px] text-slate-400">كن أول من يعلق ويرشد الزبناء لجودة المتجر!</p>
              </div>
            ) : (
              activeComments.map((comment, i) => (
                <div key={comment.id + '-' + i} className="bg-white/5 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#A78BFA] font-black">
                    <span>{comment.authorName}</span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      نشط حالياً
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 leading-relaxed text-right pr-1">
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Input field row */}
          <div className="p-3 bg-black/80 border-t border-white/5 flex gap-2 items-center">
            <input 
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="اكتب تعليقاً حقيقياً..."
              className="flex-1 bg-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#9952FF] placeholder-slate-500 text-right pr-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment(reels[activeIndex].id, activeIndex);
                }
              }}
            />
            <button
              onClick={() => handleAddComment(reels[activeIndex].id, activeIndex)}
              disabled={!newCommentText.trim()}
              className="bg-[#9952FF] disabled:bg-slate-705 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition active:scale-95"
            >
              إرسال
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
