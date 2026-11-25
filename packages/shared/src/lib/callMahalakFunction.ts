import {
  httpsCallable as firebaseHttpsCallable,
  type Functions,
  type HttpsCallable,
  type HttpsCallableResult,
} from 'firebase/functions';
import { mahalakFunctions } from './firebase';
import { getCallableErrorMessage } from '../utils/firebaseErrors';

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 700;

const RETRYABLE_CODES = new Set([
  'functions/unavailable',
  'functions/deadline-exceeded',
  'functions/resource-exhausted',
  'functions/internal',
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
]);

export interface CallMahalakOptions {
  /** Firebase callable timeout (ms). Default 45s for weak networks. */
  timeoutMs?: number;
  /** Extra attempts after the first failure. Default 2. */
  retries?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  const err = error as { code?: string; message?: string; name?: string };
  const code = String(err?.code || '');
  if (RETRYABLE_CODES.has(code)) return true;
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('offline')) return true;
  if (err?.name === 'FirebaseError' && /unavailable|deadline|internal/i.test(code)) return true;
  return false;
}

/**
 * Drop-in replacement for Firebase `httpsCallable` with timeout + retry
 * for transient network / Cloud Functions failures.
 */
export function httpsCallable<RequestData = unknown, ResponseData = unknown>(
  functionsInstance: Functions,
  name: string,
  options?: CallMahalakOptions,
): HttpsCallable<RequestData, ResponseData> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const base = firebaseHttpsCallable<RequestData, ResponseData>(functionsInstance, name, {
    timeout: timeoutMs,
  });

  const wrapped = (async (data?: RequestData) => {
    let lastError: unknown;
    const attempts = retries + 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await base(data);
      } catch (error) {
        lastError = error;
        const canRetry = attempt < attempts - 1 && isRetryable(error);
        if (!canRetry) break;
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
    throw lastError;
  }) as HttpsCallable<RequestData, ResponseData>;

  return wrapped;
}

/** Invoke a Mahalak Cloud Function with timeout/retry and typed result data. */
export async function callMahalakFunction<RequestData = unknown, ResponseData = unknown>(
  name: string,
  data?: RequestData,
  options?: CallMahalakOptions,
): Promise<ResponseData> {
  const fn = httpsCallable<RequestData, ResponseData>(mahalakFunctions, name, options);
  const result: HttpsCallableResult<ResponseData> = await fn(data);
  return result.data;
}

/** User-facing Arabic error from a failed callable (keeps existing mapping). */
export function getMahalakCallableError(error: unknown, fallback?: string): string {
  return getCallableErrorMessage(error, fallback);
}
