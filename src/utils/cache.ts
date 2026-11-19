import { db } from '@/database/db';

export const TTL = {
  /** 文章标题及 ID：长期 */
  LONG: 365 * 24 * 3600 * 1000,
  /** 文章摘要、图片 URL：7 天 */
  SUMMARY: 7 * 24 * 3600 * 1000,
  /** 文章详细内容：1 天 */
  DETAIL: 24 * 3600 * 1000,
  /** 搜索结果：1 小时 */
  SEARCH: 3600 * 1000,
};

const memory = new Map<string, { value: unknown; expiresAt: number }>();

export async function getCache<T>(key: string): Promise<T | undefined> {
  const now = Date.now();
  const m = memory.get(key);
  if (m && m.expiresAt > now) return m.value as T;
  try {
    const rec = await db.apiCache.get(key);
    if (rec && rec.expiresAt > now) {
      memory.set(key, { value: rec.value, expiresAt: rec.expiresAt });
      return rec.value as T;
    }
  } catch {
    /* IndexedDB 不可用时忽略 */
  }
  return undefined;
}

/** 读取缓存，忽略过期（网络失败时降级使用） */
export async function getStaleCache<T>(key: string): Promise<T | undefined> {
  const m = memory.get(key);
  if (m) return m.value as T;
  try {
    const rec = await db.apiCache.get(key);
    return rec?.value as T | undefined;
  } catch {
    return undefined;
  }
}

export async function setCache(key: string, value: unknown, ttl: number): Promise<void> {
  const expiresAt = Date.now() + ttl;
  memory.set(key, { value, expiresAt });
  try {
    await db.apiCache.put({ key, value, expiresAt, updatedAt: Date.now() });
  } catch {
    /* ignore */
  }
}

/**
 * 带缓存的数据获取：命中缓存直接返回；请求失败时若有过期缓存则降级使用。
 * @param ttl 缓存时长；也可以是根据结果计算缓存时长的函数（用于尊重响应头）
 */
export async function cached<T>(
  key: string,
  ttl: number | ((value: T) => number),
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = await getCache<T>(key);
  if (hit !== undefined) return hit;
  try {
    const value = await fetcher();
    await setCache(key, value, typeof ttl === 'function' ? ttl(value) : ttl);
    return value;
  } catch (e) {
    const notFound = (e as { notFound?: boolean }).notFound;
    if (!notFound) {
      const stale = await getStaleCache<T>(key);
      if (stale !== undefined) return stale;
    }
    throw e;
  }
}

export async function clearExpiredCache(): Promise<number> {
  try {
    return await db.apiCache.where('expiresAt').below(Date.now()).delete();
  } catch {
    return 0;
  }
}

export async function clearAllCache(): Promise<void> {
  memory.clear();
  await db.apiCache.clear();
}

export async function cacheSize(): Promise<number> {
  try {
    return await db.apiCache.count();
  } catch {
    return 0;
  }
}
