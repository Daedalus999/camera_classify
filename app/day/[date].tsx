import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMediaByDate } from '../../src/hooks/useMediaItems';
import MediaGrid from '../../src/components/MediaGrid';
import { MediaItem, DayMediaGroup } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { items, loading, refresh } = useMediaByDate(date ?? null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const groups = useMemo((): DayMediaGroup[] => {
    const map = new Map<number | 'none', DayMediaGroup>();
    for (const item of items) {
      const key = item.location_id ?? 'none';
      if (!map.has(key)) {
        map.set(key, {
          location: item.location_id
            ? {
                id: item.location_id,
                name: item.location_name ?? '未知地点',
                color: item.location_color ?? '#6C63FF',
                created_at: '',
                updated_at: '',
              }
            : null,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const handleItemPress = (item: MediaItem) => {
    router.push(`/media/${item.id}`);
  };

  const photoCount = items.filter(i => i.type === 'photo').length;
  const videoCount = items.filter(i => i.type === 'video').length;

  const header = (
    <View style={styles.header}>
      <Text style={styles.dateTitle}>{date ? formatDate(date) : ''}</Text>
      <View style={styles.stats}>
        {photoCount > 0 && (
          <View style={styles.statBadge}>
            <Ionicons name="image" size={14} color={Colors.primary} />
            <Text style={styles.statText}>{photoCount}</Text>
          </View>
        )}
        {videoCount > 0 && (
          <View style={styles.statBadge}>
            <Ionicons name="videocam" size={14} color={Colors.primary} />
            <Text style={styles.statText}>{videoCount}</Text>
          </View>
        )}
      </View>

      {groups.map((group, gi) => (
        group.location && (
          <View key={gi} style={styles.locationTag}>
            <View style={[styles.locationDot, { backgroundColor: group.location.color }]} />
            <Text style={styles.locationTagText}>{group.location.name}</Text>
            <Text style={styles.locationTagCount}>{group.items.length}</Text>
          </View>
        )
      ))}
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>暂无媒体</Text>
      <Text style={styles.emptyText}>点击右下角按钮添加照片或视频</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <MediaGrid
        items={items}
        onItemPress={handleItemPress}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? undefined : empty}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/upload', params: { date: date ?? '' } })}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  dateTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationTagText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  locationTagCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '600',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
