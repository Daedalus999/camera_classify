import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../types';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - ITEM_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface MediaGridProps {
  items: MediaItem[];
  onItemPress: (item: MediaItem, index: number) => void;
  onLongPress?: (item: MediaItem) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  /** When false, renders as a plain View instead of FlatList (for nesting inside SectionList). */
  scrollable?: boolean;
}

type GridRow =
  | { kind: 'group-header'; title: string; count: number; expanded: boolean }
  | { kind: 'items'; items: MediaItem[] };

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function groupByTitle(items: MediaItem[]): { grouped: Map<string, MediaItem[]>; ungrouped: MediaItem[] } {
  const titleMap = new Map<string, MediaItem[]>();
  const ungrouped: MediaItem[] = [];

  for (const item of items) {
    const t = item.title?.trim();
    if (t) {
      if (!titleMap.has(t)) titleMap.set(t, []);
      titleMap.get(t)!.push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const grouped = new Map<string, MediaItem[]>();
  const soloUngrouped: MediaItem[] = [];
  for (const [title, group] of titleMap) {
    if (group.length >= 2) {
      grouped.set(title, group);
    } else {
      soloUngrouped.push(...group);
    }
  }

  return { grouped, ungrouped: [...ungrouped, ...soloUngrouped] };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function MediaGrid({
  items,
  onItemPress,
  onLongPress,
  ListHeaderComponent,
  ListEmptyComponent,
  scrollable = true,
}: MediaGridProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const { grouped, ungrouped } = useMemo(() => groupByTitle(items), [items]);

  const rows = useMemo((): GridRow[] => {
    const result: GridRow[] = [];

    for (const [title, group] of grouped) {
      const expanded = expandedGroups.has(title);
      result.push({ kind: 'group-header', title, count: group.length, expanded });
      if (expanded) {
        for (const chunk of chunkArray(group, NUM_COLUMNS)) {
          result.push({ kind: 'items', items: chunk });
        }
      }
    }

    for (const chunk of chunkArray(ungrouped, NUM_COLUMNS)) {
      result.push({ kind: 'items', items: chunk });
    }

    return result;
  }, [grouped, ungrouped, expandedGroups]);

  const renderMediaCell = (item: MediaItem, flatIndex: number) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      onPress={() => onItemPress(item, flatIndex)}
      onLongPress={() => onLongPress?.(item)}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      {item.type === 'video' && (
        <View style={styles.videoOverlay}>
          <Ionicons name="play-circle" size={28} color="white" />
          {item.duration != null && (
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          )}
        </View>
      )}
      {item.status === 'success' && (
        <View style={[styles.statusBadge, { backgroundColor: Colors.success }]}>
          <Ionicons name="checkmark" size={10} color="white" />
        </View>
      )}
      {item.status === 'attempt' && (
        <View style={[styles.statusBadge, { backgroundColor: Colors.primary }]}>
          <Ionicons name="sync" size={10} color="white" />
        </View>
      )}
      {item.location_color && (
        <View style={[styles.locationDot, { backgroundColor: item.location_color }]} />
      )}
      {!!item.title && (
        <View style={styles.titleBar}>
          <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
        </View>
      )}
    </Pressable>
  );

  const renderRow = ({ item: row }: { item: GridRow }) => {
    if (row.kind === 'group-header') {
      return (
        <Pressable
          style={({ pressed }) => [styles.groupHeader, pressed && styles.groupHeaderPressed]}
          onPress={() => toggleGroup(row.title)}
        >
          <View style={styles.groupHeaderLeft}>
            <Ionicons
              name={row.expanded ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.groupTitle} numberOfLines={1}>{row.title}</Text>
          </View>
          <View style={styles.groupBadge}>
            <Ionicons name="layers" size={12} color={Colors.primary} />
            <Text style={styles.groupCount}>{row.count}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <View style={styles.itemRow}>
        {row.items.map((m, i) => renderMediaCell(m, i))}
        {row.items.length < NUM_COLUMNS &&
          Array.from({ length: NUM_COLUMNS - row.items.length }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.itemPlaceholder} />
          ))}
      </View>
    );
  };

  const keyExtractor = (_: GridRow, index: number) => String(index);

  if (!scrollable) {
    return (
      <View style={styles.container}>
        {items.length === 0
          ? ListEmptyComponent
          : rows.map((row, i) => (
              <React.Fragment key={i}>{renderRow({ item: row })}</React.Fragment>
            ))}
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.container}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ITEM_GAP,
    paddingBottom: 100,
  },
  itemRow: {
    flexDirection: 'row',
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_GAP / 2,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
  },
  itemPlaceholder: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_GAP / 2,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duration: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  locationDot: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  titleBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  titleText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: ITEM_GAP / 2,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  groupHeaderPressed: {
    backgroundColor: Colors.surfaceVariant,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  groupTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  groupCount: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
});
