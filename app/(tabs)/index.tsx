import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMarkedDates } from '../../src/hooks/useMediaItems';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const { markedDates, refresh } = useMarkedDates();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    router.push(`/day/${day.dateString}`);
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  const combinedMarked = {
    ...markedDates,
    [selectedDate]: {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ClimbSnap</Text>
        <Pressable
          onPress={goToToday}
          style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
        >
          <Text style={styles.todayText}>今天</Text>
        </Pressable>
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={combinedMarked}
        markingType="dot"
        theme={{
          backgroundColor: Colors.background,
          calendarBackground: Colors.surface,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.primary,
          selectedDayTextColor: Colors.white,
          todayTextColor: Colors.primary,
          dayTextColor: Colors.text,
          textDisabledColor: Colors.textTertiary,
          dotColor: Colors.primary,
          selectedDotColor: Colors.white,
          arrowColor: Colors.primary,
          monthTextColor: Colors.text,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 17,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.textTertiary} />
        <Text style={styles.hintText}>点击日期查看或添加照片/视频</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/upload', params: { date: selectedDate } })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  todayButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  todayText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  calendar: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  hintText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
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
