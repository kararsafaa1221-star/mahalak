import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, Loader2, Sparkles, Ticket, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LegalSheetModal } from '@shared/components/LegalSheetModal';
import { SpinWheelIcon } from '@shared/components/SpinWheelIcon';
import {
  formatCountdownHms,
  getEnabledSpinWheelOptions,
  resolveSpinWheelPeriodState,
  resolveSpinWheelSettings,
  type SpinWheelOption,
} from '@shared/constants/spinWheelSettings';
import type { Customer } from '@shared/types';
import {
  playSpinMissSound,
  playSpinWinSound,
  startSpinWheelSound,
} from '../../lib/spinWheelSound';

export type SpinWheelResult = {
  success: boolean;
  optionId: string;
  optionLabel: string;
  prizeType: string;
  pointsAwarded: number;
  costPoints: number;
  promoCode?: string | null;
  externalDetails?: string | null;
  pointsBalance: number;
  spinsUsedToday: number;
  dailyLimit: number;
  spinsRemaining: number | null;
  periodStartedAt?: number;
  periodEndsAt?: number;
  resetPeriodHours?: number;
  message?: string;
};

type SpinWheelPageProps = {
  open: boolean;
  onClose: () => void;
  adminSettings: Record<string, unknown> | null | undefined;
  currentCustomer: Customer | null;
  onSpin: () => Promise<SpinWheelResult>;
};

/** Total spin time (ms) — randomized in the 6–8s range per spin. */
const SPIN_DURATION_MIN_MS = 6000;
const SPIN_DURATION_MAX_MS = 8000;

function sliceDegrees(count: number): number {
  return count > 0 ? 360 / count : 360;
}

function sliceCenterDeg(index: number, count: number): number {
  const slice = sliceDegrees(count);
  return index * slice + slice / 2;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || '#7B3DFF').trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(raw);
  const full = /^#([0-9a-fA-F]{6})$/.exec(raw);
  let r = 123;
  let g = 61;
  let b = 255;
  if (full) {
    r = parseInt(full[1].slice(0, 2), 16);
    g = parseInt(full[1].slice(2, 4), 16);
    b = parseInt(full[1].slice(4, 6), 16);
  } else if (short) {
    r = parseInt(short[1][0] + short[1][0], 16);
    g = parseInt(short[1][1] + short[1][1], 16);
    b = parseInt(short[1][2] + short[1][2], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Frosted glass conic: translucent slices + soft white separators. */
function buildConicGradient(options: SpinWheelOption[]): string {
  if (!options.length) return 'rgba(123, 61, 255, 0.45)';
  const slice = sliceDegrees(options.length);
  const gap = Math.min(1.1, slice * 0.035);
  const parts: string[] = [];
  options.forEach((opt, index) => {
    const start = index * slice;
    const end = (index + 1) * slice;
    const color = hexToRgba(opt.color, 0.52);
    parts.push(`${color} ${start + gap}deg ${end - gap}deg`);
    parts.push(`rgba(255,255,255,0.38) ${Math.max(0, end - gap)}deg ${end}deg`);
  });
  return `conic-gradient(from 0deg, ${parts.join(', ')})`;
}

function sliceLabelStyle(label: string, hasImage: boolean): {
  fontSizePx: number;
  maxWidthPx: number;
  topPercent: number;
} {
  const len = Array.from(String(label || '').trim()).length;
  if (hasImage) {
    return {
      fontSizePx: len > 12 ? 8 : len > 8 ? 9 : 10,
      maxWidthPx: len > 14 ? 56 : 62,
      topPercent: 7.5,
    };
  }
  return {
    fontSizePx: len > 14 ? 8 : len > 10 ? 9 : 10,
    maxWidthPx: len > 14 ? 58 : 68,
    topPercent: 10,
  };
}

function optionIndexById(options: SpinWheelOption[], optionId: string): number {
  const idx = options.findIndex((o) => o.id === optionId);
  return idx >= 0 ? idx : 0;
}

function rotationForOption(
  index: number,
  count: number,
  currentRotation: number,
  extraTurns = 4,
): number {
  const center = sliceCenterDeg(index, count);
  const landing = (360 - (center % 360) + 360) % 360;
  const base = currentRotation - (currentRotation % 360);
  return base + extraTurns * 360 + landing;
}

function localizeOptionLabel(opt: SpinWheelOption): string {
  // نص الخيار يُدار من لوحة الإدارة — لا نستبدلها بمفاتيح i18n الثابتة
  return String(opt.label || '').trim() || '—';
}

export function SpinWheelPage({
  open,
  onClose,
  adminSettings,
  currentCustomer,
  onSpin,
}: SpinWheelPageProps) {
  const { t } = useTranslation();
  const settings = useMemo(
    () => resolveSpinWheelSettings(adminSettings || {}),
    [adminSettings],
  );
  const options = useMemo(() => getEnabledSpinWheelOptions(settings), [settings]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinDurationMs, setSpinDurationMs] = useState(7000);
  const [result, setResult] = useState<SpinWheelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const spinSoundRef = useRef<ReturnType<typeof startSpinWheelSound> | null>(null);

  const pageTitle = String(settings.title || '').trim() || t('spinWheel.defaultTitle');
  const pageSubtitle = String(settings.subtitle || '').trim() || t('spinWheel.defaultSubtitle');
  const spinButtonLabel = String(settings.spinButtonLabel || '').trim() || t('spinWheel.defaultButton');

  useEffect(() => {
    return () => {
      spinSoundRef.current?.stop();
      spinSoundRef.current = null;
    };
  }, []);

  const period = useMemo(
    () =>
      resolveSpinWheelPeriodState(
        currentCustomer as unknown as Record<string, unknown> | null,
        settings,
        nowMs,
      ),
    [currentCustomer, settings, nowMs],
  );

  const remaining = period.remaining;
  const exhausted = period.exhausted;
  const countdownMs = Math.max(0, period.periodEndsAt - nowMs);

  useEffect(() => {
    if (!open || !exhausted) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open, exhausted]);

  const gradient = useMemo(() => buildConicGradient(options), [options]);
  const resultOption = useMemo(
    () => (result ? options.find((o) => o.id === result.optionId) : null),
    [result, options],
  );

  const handleSpin = async () => {
    if (spinning || !currentCustomer || options.length < 2 || exhausted) return;
    setError(null);
    setResult(null);
    setSpinning(true);
    spinSoundRef.current?.stop();
    spinSoundRef.current = null;

    try {
      const spinResult = await onSpin();
      if (!spinResult.success) {
        setError(spinResult.message || t('errors.spinFailed'));
        setSpinning(false);
        setNowMs(Date.now());
        return;
      }

      const index = optionIndexById(options, spinResult.optionId);
      const durationMs =
        SPIN_DURATION_MIN_MS +
        Math.floor(Math.random() * (SPIN_DURATION_MAX_MS - SPIN_DURATION_MIN_MS + 1));
      const extraTurns = 12 + Math.floor(Math.random() * 5);
      setSpinDurationMs(durationMs);
      setRotation(rotationForOption(index, options.length, rotation, extraTurns));

      spinSoundRef.current = startSpinWheelSound(durationMs);

      window.setTimeout(() => {
        spinSoundRef.current?.stop();
        spinSoundRef.current = null;
        if (spinResult.prizeType === 'nothing') {
          playSpinMissSound();
        } else {
          playSpinWinSound();
        }
        setResult(spinResult);
        setSpinning(false);
        setNowMs(Date.now());
      }, durationMs);
    } catch (e) {
      spinSoundRef.current?.stop();
      spinSoundRef.current = null;
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message || '')
          : '';
      setError(message || t('errors.spinFailedRetry'));
      setSpinning(false);
    }
  };

  return (
    <LegalSheetModal open={open} onClose={onClose} title={pageTitle} icon={SpinWheelIcon as LucideIcon}>
      {!settings.enabled ? (
        <p className="text-sm font-bold text-white/70 text-center py-8">{t('spinWheel.disabled')}</p>
      ) : (
        <div className="space-y-5" dir="rtl">
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[#fff700]/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-[#7B3DFF]/25 blur-2xl" />
            <p className="relative text-center text-xs font-bold text-white/85 leading-relaxed">
              {pageSubtitle}
            </p>
            <div className="relative mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff700]/20 text-[#fff700] border border-white/15">
                  <Wallet size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-white/55">{t('spinWheel.balanceLabel')}</p>
                  <p className="truncate text-[11px] font-black text-white">
                    {t('spinWheel.pointsUnit', { count: (currentCustomer?.points ?? 0).toLocaleString() })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7B3DFF]/30 text-[#e4d4ff] border border-white/15">
                  <Ticket size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-white/55">{t('spinWheel.attemptsLabel')}</p>
                  <p className="truncate text-[11px] font-black text-white">
                    {remaining === null ? t('spinWheel.unlimited') : t('spinWheel.remaining', { count: remaining })}
                  </p>
                </div>
              </div>
            </div>
            {settings.costPoints > 0 && (
              <p className="relative mt-2 text-center text-[10px] font-black text-amber-200/90">
                {t('spinWheel.costPoints', { count: settings.costPoints })}
              </p>
            )}
          </div>

          <div className="relative mx-auto w-[min(100%,300px)] aspect-square">
            <div className="pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(123,61,255,0.4)_0%,rgba(255,247,0,0.08)_42%,transparent_70%)] blur-sm" />

            <div
              className="absolute inset-0 rounded-full border border-white/35 backdrop-blur-[2px]"
              style={{
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0.02) 62%, rgba(255,255,255,0.16) 100%)',
                boxShadow:
                  '0 18px 40px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -8px 20px rgba(0,0,0,0.18)',
              }}
            />

            <div className="absolute left-1/2 -top-0.5 z-30 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
              <div className="w-0 h-0 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-[#fff700]" />
              <div className="absolute left-1/2 top-[3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70" />
            </div>

            <div
              className="absolute inset-[5%] overflow-hidden rounded-full border border-white/40 transition-transform ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: `${spinDurationMs}ms`,
                background: `
                  radial-gradient(circle at 32% 28%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.08) 28%, transparent 52%),
                  ${gradient}
                `,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow:
                  'inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -18px 36px rgba(0,0,0,0.22), inset 0 14px 28px rgba(255,255,255,0.12), 0 10px 28px rgba(0,0,0,0.28)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,0.22) 28deg, transparent 62deg, transparent 180deg, rgba(255,255,255,0.1) 210deg, transparent 250deg)',
                  mixBlendMode: 'soft-light',
                }}
              />
              {options.map((opt, index) => {
                const angle = sliceCenterDeg(index, options.length);
                const hasImage = Boolean(opt.imageUrl);
                const displayLabel = localizeOptionLabel(opt);
                const labelStyle = sliceLabelStyle(displayLabel, hasImage);
                return (
                  <div
                    key={opt.id}
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div
                      className="absolute left-1/2 flex w-0 flex-col items-center justify-start"
                      style={{
                        top: `${labelStyle.topPercent}%`,
                        transform: `translateX(-50%) rotate(${-angle}deg)`,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center gap-0.5"
                        style={{ width: labelStyle.maxWidthPx }}
                      >
                        {hasImage ? (
                          <img
                            src={opt.imageUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-lg object-cover border border-white/55 shadow-[0_3px_10px_rgba(0,0,0,0.35)] bg-white/15"
                            draggable={false}
                          />
                        ) : null}
                        <span
                          className="w-full text-center font-black text-white leading-[1.15]"
                          style={{
                            fontSize: labelStyle.fontSizePx,
                            textShadow:
                              '0 1px 2px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.35)',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                          }}
                        >
                          {displayLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="absolute inset-[39%] z-20 overflow-hidden rounded-full flex items-center justify-center border border-white/45"
              style={{
                background:
                  'linear-gradient(160deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 42%, rgba(11,19,32,0.55) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow:
                  '0 0 0 5px rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.55)',
              }}
            >
              {settings.centerImageUrl ? (
                <img
                  src={settings.centerImageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-95"
                  draggable={false}
                />
              ) : (
                <SpinWheelIcon size={26} className="text-[#fff700] drop-shadow-[0_0_8px_rgba(255,247,0,0.45)]" />
              )}
            </div>
          </div>

          {exhausted && (
            <div className="rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-500/20 to-rose-500/10 px-4 py-4 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-200">
                <Clock3 size={20} />
              </div>
              <p className="text-sm font-black text-amber-50">{t('spinWheel.exhaustedTitle')}</p>
              <p className="text-[11px] font-bold text-white/70">
                {t('spinWheel.exhaustedHint', { hours: settings.resetPeriodHours })}
              </p>
              <p
                className="font-black text-3xl tracking-[0.12em] text-[#fff700] tabular-nums"
                dir="ltr"
              >
                {formatCountdownHms(countdownMs)}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-center text-[11px] font-bold text-rose-100">
              {error}
            </div>
          )}

          {result && !spinning && (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent px-4 py-4 text-center space-y-2">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
              <p className="relative text-sm font-black text-emerald-100 flex items-center justify-center gap-1.5">
                <Sparkles size={16} />
                {result.prizeType === 'nothing' ? t('spinWheel.betterLuck') : t('spinWheel.congrats')}
              </p>
              {resultOption?.imageUrl ? (
                <img
                  src={resultOption.imageUrl}
                  alt=""
                  className="relative mx-auto w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg"
                />
              ) : null}
              <p className="relative text-sm font-black text-white">
                {resultOption ? localizeOptionLabel(resultOption) : result.optionLabel}
              </p>
              {result.pointsAwarded > 0 && (
                <p className="relative text-xs font-black text-[#fff700]">
                  {t('spinWheel.pointsAwarded', { count: result.pointsAwarded.toLocaleString() })}
                </p>
              )}
              {result.promoCode && (
                <p className="relative text-[11px] font-black text-sky-200" dir="ltr">
                  {t('spinWheel.promoCode', { code: result.promoCode })}
                </p>
              )}
              {result.prizeType === 'external' && (
                <p className="relative text-[11px] font-bold text-amber-100 leading-relaxed mt-1">
                  {result.externalDetails || t('spinWheel.externalFallback')}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSpin}
            disabled={
              spinning || !currentCustomer || exhausted || (remaining !== null && remaining <= 0)
            }
            className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-[#5b21b6] via-[#7B3DFF] to-[#9b6bff] border border-white/25 text-white text-sm font-black flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(123,61,255,0.35)] active:scale-[0.98] disabled:opacity-45 disabled:shadow-none"
          >
            {spinning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('spinWheel.spinning')}
              </>
            ) : exhausted ? (
              <>
                <Clock3 size={18} />
                {t('spinWheel.waitCountdown')}
              </>
            ) : (
              <>
                <SpinWheelIcon size={18} />
                {spinButtonLabel}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white/80 text-xs font-black flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            {t('spinWheel.close')}
          </button>
        </div>
      )}
    </LegalSheetModal>
  );
}
