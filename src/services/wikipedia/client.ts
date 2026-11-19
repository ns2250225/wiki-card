import { sleep } from '@/utils/random';

/**
 * Wikipedia 请求客户端
 * - 并发限制（最多 3 个同时请求）
 * - 请求超时
 * - 指数退避重试
 * - 遵循 Retry-After
 * - 相同请求合并（in-flight 去重）
 * - 单次开包请求预算
 */

export class WikiApiError extends Error {
  status?: number;
  notFound?: boolean;
  rateLimited?: boolean;
  network?: boolean;
  retryAfter?: number;
  constructor(message: string, init: Partial<WikiApiError> = {}) {
    super(message);
    this.name = 'WikiApiError';
    Object.assign(this, init);
  }
}

export class BudgetExceededError extends Error {
  constructor() {
    super('已达到本次请求上限，请稍后再试');
    this.name = 'BudgetExceededError';
  }
}

/** 请求预算：避免一次抽卡中无节制请求 */
export class RequestBudget {
  used = 0;
  constructor(public readonly max: number) {}
  consume() {
    if (this.used >= this.max) throw new BudgetExceededError();
    this.used++;
  }
  get remaining() {
    return this.max - this.used;
  }
}

const MAX_CONCURRENT = 3;
let active = 0;
const queue: (() => void)[] = [];
/** 全局限流暂停（收到 429 后） */
let pausedUntil = 0;

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  active++;
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

export function isRateLimitPaused(): boolean {
  return Date.now() < pausedUntil;
}

export function rateLimitRemaining(): number {
  return Math.max(0, pausedUntil - Date.now());
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const sec = Number(value);
  if (!Number.isNaN(sec)) return sec * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/** 解析 Cache-Control max-age（毫秒），用于尊重 API 缓存策略 */
export function parseMaxAge(cacheControl: string | null): number | undefined {
  if (!cacheControl) return undefined;
  const m = /(?:s-)?max-age=(\d+)/.exec(cacheControl);
  return m ? Number(m[1]) * 1000 : undefined;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  budget?: RequestBudget;
  headers?: Record<string, string>;
  /** 返回文本而不是 JSON */
  text?: boolean;
}

export interface FetchResult<T> {
  data: T;
  maxAge?: number;
}

const inflight = new Map<string, Promise<FetchResult<unknown>>>();

export function wikiFetch<T>(url: string, opts: FetchOptions = {}): Promise<FetchResult<T>> {
  const key = `${opts.text ? 'T' : 'J'}|${url}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<FetchResult<T>>;
  const p = doFetch<T>(url, opts).finally(() => inflight.delete(key));
  inflight.set(key, p as Promise<FetchResult<unknown>>);
  return p;
}

async function doFetch<T>(url: string, opts: FetchOptions): Promise<FetchResult<T>> {
  const { timeout = 12000, retries = 3, budget } = opts;
  let attempt = 0;
  for (;;) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new WikiApiError('当前处于离线状态', { network: true });
    }
    const wait = rateLimitRemaining();
    if (wait > 0) {
      if (wait > 15000) {
        throw new WikiApiError('Wikipedia 请求过于频繁，请稍后重试', { rateLimited: true, retryAfter: wait });
      }
      await sleep(wait);
    }
    budget?.consume();
    await acquire();
    let res: Response | undefined;
    let networkError: unknown;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: opts.text ? 'text/html' : 'application/json', ...(opts.headers ?? {}) },
        signal: controller.signal,
        credentials: 'omit',
        mode: 'cors',
      });
    } catch (e) {
      networkError = e;
    } finally {
      clearTimeout(timer);
      release();
    }

    if (res && res.ok) {
      const maxAge = parseMaxAge(res.headers.get('cache-control'));
      const data = (opts.text ? await res.text() : await res.json()) as T;
      return { data, maxAge };
    }

    if (res) {
      if (res.status === 404) {
        throw new WikiApiError('文章不存在', { status: 404, notFound: true });
      }
      if (res.status === 429) {
        const ra = parseRetryAfter(res.headers.get('retry-after')) ?? 2000 * 2 ** attempt;
        pausedUntil = Date.now() + ra;
        if (attempt >= retries || ra > 15000) {
          throw new WikiApiError('Wikipedia 限流中，请稍后重试', { status: 429, rateLimited: true, retryAfter: ra });
        }
        attempt++;
        continue;
      }
      if (res.status >= 500 || res.status === 408) {
        if (attempt >= retries) {
          throw new WikiApiError(`Wikipedia 服务暂时不可用（${res.status}）`, { status: res.status });
        }
        const ra = parseRetryAfter(res.headers.get('retry-after'));
        await sleep(ra ?? backoff(attempt));
        attempt++;
        continue;
      }
      throw new WikiApiError(`请求失败（${res.status}）`, { status: res.status });
    }

    // 网络错误或超时
    if (attempt >= retries) {
      const aborted = (networkError as Error)?.name === 'AbortError';
      throw new WikiApiError(aborted ? '请求超时，请检查网络' : '网络异常，无法连接 Wikipedia', { network: true });
    }
    await sleep(backoff(attempt));
    attempt++;
  }
}

function backoff(attempt: number): number {
  return Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 300);
}

// ========== URL 构建 ==========

export function wikiHost(lang: string): string {
  return `https://${lang}.wikipedia.org`;
}

/** 文章标题编码为 URL 路径段 */
export function encodeTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'));
}

/** 中文维基统一使用简体变体 */
export function variantHeaders(lang: string): Record<string, string> {
  return lang === 'zh' ? { 'Accept-Language': 'zh-cn' } : {};
}

export function actionApiUrl(lang: string, params: Record<string, string | number>): string {
  const search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*', // Action API 匿名跨域请求
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  if (lang === 'zh' && !search.has('variant')) search.set('variant', 'zh-cn');
  return `${wikiHost(lang)}/w/api.php?${search.toString()}`;
}

export function commonsApiUrl(params: Record<string, string | number>): string {
  const search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `https://commons.wikimedia.org/w/api.php?${search.toString()}`;
}

/** 将错误转为用户可读的提示 */
export function describeError(e: unknown): string {
  if (e instanceof BudgetExceededError) return e.message;
  if (e instanceof WikiApiError) return e.message;
  if (e instanceof Error) return e.message;
  return '未知错误';
}
