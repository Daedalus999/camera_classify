import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, SectionList, StyleSheet } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMediaByMonth } from '../../src/hooks/useMediaItems';
import MediaGrid from '../../src/components/MediaGrid';
import { MediaItem } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

interface DateSection {
  date: string;
  data: MediaItem[][];
}

export default function MonthDetailScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { items, loading, refresh } = useMediaByMonth(month ?? null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sections = useMemo((): DateSection[] => {
    const map = new Map<string, MediaItem[]>();
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dateItems]) => ({ date, data: [dateItems] }));
  }, [items]);

  const handleItemPress = (item: MediaItem) => {
    router.push(`/media/${item.id}`);
  };

  const photoCount = items.filter(i => i.type === 'photo').length;
  const videoCount = items.filter(i => i.type === 'video').length;

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(_, index) => String(index)}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.monthTitle}>{month ? formatMonth(month) : ''}</Text>
            <View style={styles.stats}>
              <View style={styles.statBadge}>
                <Ionicons name="calendar" size={14} color={Colors.primary} />
                <Text style={styles.statText}>{sections.length} 天</Text>
              </View>
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
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            style={({ pressed }) => [styles.dateHeader, pressed && styles.pressed]}
            onPress={() => router.push(`/day/${section.date}`)}
          >
            <Text style={styles.dateText}>{formatDate(section.date)}</Text>
            <View style={styles.dateCount}>
              <Text style={styles.dateCountText}>{section.data[0].length}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
            </View>
          </Pressable>
        )}
        renderItem={({ item: dateItems }) => (
          <MediaGrid items={dateItems} onItemPress={handleItemPress} onGroupRenamed={refresh} />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>暂无媒体</Text>
              <Text style={styles.emptyText}>这个月还没有记录</Text>
            </View>
          )
        }
      />
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
    paddingBottom: Spacing.sm,
  },
  monthTitle: {
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
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  dateText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  dateCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateCountText: {
    fontSize: FontSize.sm,
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
});
