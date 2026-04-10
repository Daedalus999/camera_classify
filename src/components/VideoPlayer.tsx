import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { PlaybackSpeed, PLAYBACK_SPEEDS } from '../types';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  shouldPlay?: boolean;
}

function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SpeedPicker({
  current,
  onSelect,
  onClose,
}: {
  current: PlaybackSpeed;
  onSelect: (s: PlaybackSpeed) => void;
  onClose: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <Pressable style={styles.speedPickerOverlay} onPress={onClose}>
      <Animated.View style={[styles.speedPickerPanel, { opacity: fadeAnim }]}>
        <Text style={styles.speedPickerTitle}>播放速度</Text>
        <View style={styles.speedPickerOptions}>
          {PLAYBACK_SPEEDS.map(s => {
            const active = s === current;
            return (
              <Pressable
                key={s}
                style={[styles.speedOption, active && styles.speedOptionActive]}
                onPress={() => onSelect(s)}
              >
                <Text style={[styles.speedOptionText, active && styles.speedOptionTextActive]}>
                  {s}x
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function VideoPlayer({ uri, shouldPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(shouldPlay);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying && !showSpeedPicker) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, showSpeedPicker]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);
    setIsLoading(status.isBuffering);
  }, []);

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setShowControls(true);
    scheduleHide();
  }, [isPlaying, scheduleHide]);

  const selectSpeed = useCallback(async (newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
    setShowSpeedPicker(false);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(newSpeed, true);
    }
    scheduleHide();
  }, [scheduleHide]);

  const seekRelative = useCallback(async (seconds: number) => {
    if (!videoRef.current) return;
    const newPos = Math.max(0, Math.min(position + seconds * 1000, duration));
    await videoRef.current.setPositionAsync(newPos);
    setShowControls(true);
    scheduleHide();
  }, [position, duration, scheduleHide]);

  const toggleControls = useCallback(() => {
    if (showSpeedPicker) {
      setShowSpeedPicker(false);
      return;
    }
    setShowControls(prev => {
      if (!prev) scheduleHide();
      return !prev;
    });
  }, [scheduleHide, showSpeedPicker]);

  const openSpeedPicker = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowSpeedPicker(true);
  }, []);

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={shouldPlay}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        rate={speed}
      />

      <TouchableOpacity
        style={styles.touchArea}
        onPress={toggleControls}
        activeOpacity={1}
      >
        {isLoading && (
          <ActivityIndicator size="large" color={Colors.white} />
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.centerControls}>
              <TouchableOpacity onPress={() => seekRelative(-10)} style={styles.seekButton}>
                <Ionicons name="play-back" size={28} color="white" />
                <Text style={styles.seekText}>10s</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={44}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => seekRelative(10)} style={styles.seekButton}>
                <Ionicons name="play-forward" size={28} color="white" />
                <Text style={styles.seekText}>10s</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
              <TouchableOpacity onPress={openSpeedPicker} style={styles.speedButton}>
                <Text style={styles.speedText}>{speed}x</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {showSpeedPicker && (
        <SpeedPicker
          current={speed}
          onSelect={selectSpeed}
          onClose={() => { setShowSpeedPicker(false); scheduleHide(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  seekButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  seekText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  progressContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 48,
    alignItems: 'center',
  },
  speedText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  speedPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  speedPickerPanel: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    minWidth: 240,
  },
  speedPickerTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },
  speedPickerOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  speedOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedOptionActive: {
    backgroundColor: Colors.primary,
  },
  speedOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  speedOptionTextActive: {
    color: Colors.white,
  },
});
