export interface Location {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type MediaStatus = 'none' | 'success' | 'attempt';

export interface MediaItem {
  id: number;
  uri: string;
  type: 'photo' | 'video';
  date: string;
  location_id: number | null;
  location_name?: string;
  location_color?: string;
  title: string | null;
  status: MediaStatus;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbnail_uri: string | null;
  created_at: string;
}

export interface DayMediaGroup {
  location: Location | null;
  items: MediaItem[];
}

export interface MonthStat {
  month: string;
  days: number;
}

export type PlaybackSpeed = 0.5 | 1.0 | 1.5 | 2.0 | 3.0;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 1.0, 1.5, 2.0, 3.0];
