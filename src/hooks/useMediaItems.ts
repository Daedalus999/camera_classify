import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types';
import * as db from '../db/database';

export function useMediaByDate(date: string | null) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!date) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await db.getMediaByDate(date);
      setItems(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useMediaByMonth(month: string | null) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!month) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await db.getMediaByMonth(month);
      setItems(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useMediaByLocation(locationId: number | null) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (locationId === null) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await db.getMediaByLocation(locationId);
      setItems(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useMarkedDates() {
  const [markedDates, setMarkedDates] = useState<Record<string, { marked: boolean; dotColor: string }>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await db.getMarkedDates();
      setMarkedDates(data);
    } catch (error) {
      console.error('Failed to load marked dates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { markedDates, loading, refresh };
}
