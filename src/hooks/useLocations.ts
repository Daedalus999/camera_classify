import { useState, useEffect, useCallback } from 'react';
import { Location } from '../types';
import * as db from '../db/database';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await db.getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addLocation = useCallback(async (name: string): Promise<Location | null> => {
    try {
      const location = await db.createLocation(name);
      setLocations(prev => [...prev, location].sort((a, b) => a.name.localeCompare(b.name)));
      return location;
    } catch (error: any) {
      console.error('Failed to create location:', error);
      const msg = error?.message ?? String(error);
      if (msg.includes('UNIQUE')) {
        alert('该地点名称已存在');
      } else {
        alert(`添加地点失败: ${msg}`);
      }
      return null;
    }
  }, []);

  const editLocation = useCallback(async (id: number, name: string) => {
    try {
      await db.updateLocation(id, name);
      await refresh();
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [refresh]);

  const removeLocation = useCallback(async (id: number) => {
    try {
      await db.deleteLocation(id);
      setLocations(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  }, []);

  return { locations, loading, refresh, addLocation, editLocation, removeLocation };
}
