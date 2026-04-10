import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMonthlyStats } from '../../src/db/database';
import { MonthStat } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

export default function HomeScreen() {
  const [stats, setStats] = useState<MonthStat[]>([]);
  const [totalDays, setTotalDays] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getMonthlyStats();
        setStats(data);
        setTotalDays(data.reduce((sum, s) => sum + s.days, 0));
      })();
    }, [])
  );

  const renderItem = ({ item }: { item: MonthStat }) => (
    <Pressable
      style={({ pressed }) => [styles.monthCard, pressed && styles.pressed]}
      onPress={() => router.push(`/month/${item.month}`)}
    >
      <View style={styles.monthInfo}>
        <Text style={styles.monthText}>{formatMonth(item.month)}</Text>
      </View>
      <View style={styles.daysBadge}>
        <Text style={styles.daysNumber}>{item.days}</Text>
        <Text style={styles.daysLabel}>天</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={stats}
        renderItem={renderItem}
        keyExtractor={(item) => item.month}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>ClimbSnap</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{totalDays}</Text>
                <Text style={styles.summaryLabel}>训练天数</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{stats.length}</Text>
                <Text style={styles.summaryLabel}>活跃月份</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>暂无记录</Text>
            <Text style={styles.emptyText}>去日历页添加你的第一条攀岩记录吧</Text>
          </View>
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
  list: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.white,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  monthInfo: {
    flex: 1,
  },
  monthText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  daysNumber: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  daysLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
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
