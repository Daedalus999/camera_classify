import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMediaByLocation } from '../../src/hooks/useMediaItems';
import { getAllLocations } from '../../src/db/database';
import MediaGrid from '../../src/components/MediaGrid';
import { Location, MediaItem } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const locationId = id ? Number(id) : null;
  const { items, loading, refresh } = useMediaByLocation(locationId);
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    (async () => {
      const locs = await getAllLocations();
      const found = locs.find(l => l.id === locationId);
      setLocation(found ?? null);
    })();
  }, [locationId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleItemPress = (item: MediaItem) => {
    router.push(`/media/${item.id}`);
  };

  const photoCount = items.filter(i => i.type === 'photo').length;
  const videoCount = items.filter(i => i.type === 'video').length;

  const uniqueDates = new Set(items.map(i => i.date));

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {location && (
          <View style={[styles.colorDot, { backgroundColor: location.color }]} />
        )}
        <Text style={styles.title}>{location?.name ?? '加载中...'}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{items.length}</Text>
          <Text style={styles.statLabel}>总计</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{photoCount}</Text>
          <Text style={styles.statLabel}>照片</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{videoCount}</Text>
          <Text style={styles.statLabel}>视频</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{uniqueDates.size}</Text>
          <Text style={styles.statLabel}>天</Text>
        </View>
      </View>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>暂无媒体</Text>
      <Text style={styles.emptyText}>在日历页上传媒体时选择此地点</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: location?.name ?? '' }} />
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <MediaGrid
          items={items}
          onItemPress={handleItemPress}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minWidth: 64,
  },
  statNumber: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
