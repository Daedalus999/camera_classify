import { Platform } from 'react-native';
import { Location, MediaItem, MediaStatus, MonthStat } from '../types';
import { LocationColors } from '../constants/theme';

// ── Platform-agnostic storage interface ──

interface DB {
  locations: Location[];
  mediaItems: (MediaItem & { location_id: number | null })[];
  nextLocationId: number;
  nextMediaId: number;
}

// ── Web: localStorage-backed JSON store ──

const STORAGE_KEY = 'climbsnap_db';

function loadWebDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { locations: [], mediaItems: [], nextLocationId: 1, nextMediaId: 1 };
}

function saveWebDB(db: DB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ── Native: expo-sqlite ──

let nativeDb: import('expo-sqlite').SQLiteDatabase | null = null;

let dbInitPromise: Promise<import('expo-sqlite').SQLiteDatabase> | null = null;

async function getNativeDatabase(): Promise<import('expo-sqlite').SQLiteDatabase> {
  if (nativeDb) return nativeDb;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQLite = await import('expo-sqlite');
    const db = await SQLite.openDatabaseAsync('climbsnap.db');
    await db.execAsync(`PRAGMA journal_mode = WAL`);
    await db.execAsync(`PRAGMA foreign_keys = ON`);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#6C63FF',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS media_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uri TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
        date TEXT NOT NULL,
        location_id INTEGER,
        duration REAL,
        width INTEGER,
        height INTEGER,
        thumbnail_uri TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
      )
    `);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_media_date ON media_items(date)`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_media_location ON media_items(location_id)`);
    // migrate: add title and status columns for existing databases
    try {
      await db.execAsync(`ALTER TABLE media_items ADD COLUMN title TEXT`);
    } catch {}
    try {
      await db.execAsync(`ALTER TABLE media_items ADD COLUMN status TEXT NOT NULL DEFAULT 'none'`);
    } catch {}
    nativeDb = db;
    return db;
  })();

  return dbInitPromise;
}

const isWeb = Platform.OS === 'web';

// ── Location Operations ──

export async function getAllLocations(): Promise<Location[]> {
  if (isWeb) {
    return loadWebDB().locations.sort((a, b) => a.name.localeCompare(b.name));
  }
  const db = await getNativeDatabase();
  return db.getAllAsync<Location>('SELECT * FROM locations ORDER BY name ASC');
}

export async function createLocation(name: string): Promise<Location> {
  const trimmed = name.trim();
  if (isWeb) {
    const store = loadWebDB();
    const color = LocationColors[store.locations.length % LocationColors.length];
    const loc: Location = {
      id: store.nextLocationId++,
      name: trimmed,
      color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.locations.push(loc);
    saveWebDB(store);
    return loc;
  }

  const db = await getNativeDatabase();
  const existing = await getAllLocations();
  const color = LocationColors[existing.length % LocationColors.length];
  const result = await db.runAsync(
    'INSERT INTO locations (name, color) VALUES (?, ?)',
    trimmed, color
  );
  return {
    id: result.lastInsertRowId,
    name: trimmed,
    color,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateLocation(id: number, name: string): Promise<void> {
  const trimmed = name.trim();
  if (isWeb) {
    const store = loadWebDB();
    const loc = store.locations.find(l => l.id === id);
    if (loc) {
      loc.name = trimmed;
      loc.updated_at = new Date().toISOString();
      saveWebDB(store);
    }
    return;
  }
  const db = await getNativeDatabase();
  await db.runAsync(
    "UPDATE locations SET name = ?, updated_at = datetime('now') WHERE id = ?",
    trimmed, id
  );
}

export async function deleteLocation(id: number): Promise<void> {
  if (isWeb) {
    const store = loadWebDB();
    store.locations = store.locations.filter(l => l.id !== id);
    store.mediaItems.forEach(m => {
      if (m.location_id === id) m.location_id = null;
    });
    saveWebDB(store);
    return;
  }
  const db = await getNativeDatabase();
  await db.runAsync('DELETE FROM locations WHERE id = ?', id);
}

export async function getLocationMediaCount(locationId: number): Promise<number> {
  if (isWeb) {
    return loadWebDB().mediaItems.filter(m => m.location_id === locationId).length;
  }
  const db = await getNativeDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM media_items WHERE location_id = ?',
    locationId
  );
  return result?.count ?? 0;
}

// ── Media Operations ──

interface AddMediaItemInput {
  uri: string;
  type: 'photo' | 'video';
  date: string;
  location_id: number | null;
  title?: string | null;
  status?: MediaStatus;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
}

export async function addMediaItem(item: AddMediaItemInput): Promise<number> {
  const title = item.title?.trim() || null;
  const status: MediaStatus = item.status ?? 'none';
  if (isWeb) {
    const store = loadWebDB();
    const id = store.nextMediaId++;
    store.mediaItems.push({
      id,
      uri: item.uri,
      type: item.type,
      date: item.date,
      location_id: item.location_id,
      title,
      status,
      duration: item.duration ?? null,
      width: item.width ?? null,
      height: item.height ?? null,
      thumbnail_uri: null,
      created_at: new Date().toISOString(),
    });
    saveWebDB(store);
    return id;
  }
  const db = await getNativeDatabase();
  const duration = item.duration != null ? item.duration : null;
  const width = item.width != null ? item.width : null;
  const height = item.height != null ? item.height : null;
  const locationId = item.location_id != null ? item.location_id : null;
  const result = await db.runAsync(
    `INSERT INTO media_items (uri, type, date, location_id, title, status, duration, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.uri, item.type, item.date, locationId, title, status, duration, width, height
  );
  return result.lastInsertRowId;
}

export async function addMediaItems(items: AddMediaItemInput[]): Promise<void> {
  if (isWeb) {
    for (const item of items) {
      await addMediaItem(item);
    }
    return;
  }
  const db = await getNativeDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const item of items) {
      const title = item.title?.trim() || null;
      const status: MediaStatus = item.status ?? 'none';
      const duration = item.duration != null ? item.duration : null;
      const width = item.width != null ? item.width : null;
      const height = item.height != null ? item.height : null;
      const locationId = item.location_id != null ? item.location_id : null;
      await txn.runAsync(
        `INSERT INTO media_items (uri, type, date, location_id, title, status, duration, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.uri, item.type, item.date, locationId, title, status, duration, width, height
      );
    }
  });
}

function enrichMedia(store: DB, m: DB['mediaItems'][0]): MediaItem {
  const loc = m.location_id != null ? store.locations.find(l => l.id === m.location_id) : null;
  return {
    ...m,
    title: (m as any).title ?? null,
    status: (m as any).status ?? 'none',
    location_name: loc?.name,
    location_color: loc?.color,
  };
}

export async function getMediaByMonth(month: string): Promise<MediaItem[]> {
  if (isWeb) {
    const store = loadWebDB();
    return store.mediaItems
      .filter(m => m.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      .map(m => enrichMedia(store, m));
  }
  const db = await getNativeDatabase();
  return db.getAllAsync<MediaItem>(
    `SELECT m.*, l.name as location_name, l.color as location_color
     FROM media_items m LEFT JOIN locations l ON m.location_id = l.id
     WHERE substr(m.date, 1, 7) = ? ORDER BY m.date DESC, m.created_at DESC`,
    month
  );
}

export async function getMediaByDate(date: string): Promise<MediaItem[]> {
  if (isWeb) {
    const store = loadWebDB();
    return store.mediaItems
      .filter(m => m.date === date)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(m => enrichMedia(store, m));
  }
  const db = await getNativeDatabase();
  return db.getAllAsync<MediaItem>(
    `SELECT m.*, l.name as location_name, l.color as location_color
     FROM media_items m LEFT JOIN locations l ON m.location_id = l.id
     WHERE m.date = ? ORDER BY m.created_at DESC`,
    date
  );
}

export async function getMediaByLocation(locationId: number): Promise<MediaItem[]> {
  if (isWeb) {
    const store = loadWebDB();
    return store.mediaItems
      .filter(m => m.location_id === locationId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      .map(m => enrichMedia(store, m));
  }
  const db = await getNativeDatabase();
  return db.getAllAsync<MediaItem>(
    `SELECT m.*, l.name as location_name, l.color as location_color
     FROM media_items m LEFT JOIN locations l ON m.location_id = l.id
     WHERE m.location_id = ? ORDER BY m.date DESC, m.created_at DESC`,
    locationId
  );
}

export async function getMediaById(id: number): Promise<MediaItem | null> {
  if (isWeb) {
    const store = loadWebDB();
    const m = store.mediaItems.find(item => item.id === id);
    return m ? enrichMedia(store, m) : null;
  }
  const db = await getNativeDatabase();
  return db.getFirstAsync<MediaItem>(
    `SELECT m.*, l.name as location_name, l.color as location_color
     FROM media_items m LEFT JOIN locations l ON m.location_id = l.id
     WHERE m.id = ?`,
    id
  );
}

export async function updateMediaItem(
  id: number,
  updates: { title?: string | null; status?: MediaStatus; location_id?: number | null }
): Promise<void> {
  if (isWeb) {
    const store = loadWebDB();
    const m = store.mediaItems.find(item => item.id === id);
    if (m) {
      if (updates.title !== undefined) (m as any).title = updates.title?.trim() || null;
      if (updates.status !== undefined) (m as any).status = updates.status;
      if (updates.location_id !== undefined) m.location_id = updates.location_id;
      saveWebDB(store);
    }
    return;
  }
  const db = await getNativeDatabase();
  const setClauses: string[] = [];
  const params: any[] = [];
  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title?.trim() || null);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(updates.status);
  }
  if (updates.location_id !== undefined) {
    setClauses.push('location_id = ?');
    params.push(updates.location_id);
  }
  if (setClauses.length === 0) return;
  params.push(id);
  await db.runAsync(
    `UPDATE media_items SET ${setClauses.join(', ')} WHERE id = ?`,
    ...params
  );
}

export async function deleteMediaItem(id: number): Promise<void> {
  if (isWeb) {
    const store = loadWebDB();
    store.mediaItems = store.mediaItems.filter(m => m.id !== id);
    saveWebDB(store);
    return;
  }
  const db = await getNativeDatabase();
  await db.runAsync('DELETE FROM media_items WHERE id = ?', id);
}

export async function getMarkedDates(): Promise<Record<string, { marked: boolean; dotColor: string }>> {
  if (isWeb) {
    const store = loadWebDB();
    const result: Record<string, { marked: boolean; dotColor: string }> = {};
    for (const m of store.mediaItems) {
      if (!result[m.date]) {
        const loc = m.location_id != null ? store.locations.find(l => l.id === m.location_id) : null;
        result[m.date] = { marked: true, dotColor: loc?.color ?? '#6C63FF' };
      }
    }
    return result;
  }
  const db = await getNativeDatabase();
  const rows = await db.getAllAsync<{ date: string; color: string | null }>(
    `SELECT DISTINCT m.date, l.color
     FROM media_items m LEFT JOIN locations l ON m.location_id = l.id
     ORDER BY m.date`
  );
  const result: Record<string, { marked: boolean; dotColor: string }> = {};
  for (const row of rows) {
    result[row.date] = { marked: true, dotColor: row.color ?? '#6C63FF' };
  }
  return result;
}

export async function getMonthlyStats(): Promise<MonthStat[]> {
  if (isWeb) {
    const store = loadWebDB();
    const monthSet = new Map<string, Set<string>>();
    for (const m of store.mediaItems) {
      const month = m.date.substring(0, 7);
      if (!monthSet.has(month)) monthSet.set(month, new Set());
      monthSet.get(month)!.add(m.date);
    }
    return Array.from(monthSet.entries())
      .map(([month, dates]) => ({ month, days: dates.size }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }
  const db = await getNativeDatabase();
  return db.getAllAsync<MonthStat>(
    `SELECT substr(date, 1, 7) as month, COUNT(DISTINCT date) as days
     FROM media_items GROUP BY month ORDER BY month DESC`
  );
}

export async function clearAllData(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (nativeDb) {
    await nativeDb.closeAsync();
    nativeDb = null;
    dbInitPromise = null;
  }
  try {
    const SQLite = await import('expo-sqlite');
    await SQLite.deleteDatabaseAsync('climbsnap.db');
  } catch (e: any) {
    if (e?.message?.includes('deleteDatabaseAsync') || e?.message?.includes('does not exist')) {
      // DB already deleted — safe to ignore
    } else {
      throw e;
    }
  }
}

export async function getMediaCountByDate(date: string): Promise<{ photos: number; videos: number }> {
  if (isWeb) {
    const store = loadWebDB();
    const items = store.mediaItems.filter(m => m.date === date);
    return {
      photos: items.filter(m => m.type === 'photo').length,
      videos: items.filter(m => m.type === 'video').length,
    };
  }
  const db = await getNativeDatabase();
  const photos = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM media_items WHERE date = ? AND type = 'photo'",
    date
  );
  const videos = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM media_items WHERE date = ? AND type = 'video'",
    date
  );
  return { photos: photos?.count ?? 0, videos: videos?.count ?? 0 };
}
