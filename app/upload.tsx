import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import LocationPicker from '../src/components/LocationPicker';
import { useLocations } from '../src/hooks/useLocations';
import { addMediaItems } from '../src/db/database';
import { MediaStatus } from '../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';

interface SelectedAsset {
  uri: string;
  type: 'photo' | 'video';
  duration?: number;
  width?: number;
  height?: number;
  fileName?: string;
}

const STATUS_OPTIONS: { value: MediaStatus; label: string; icon: string; color: string }[] = [
  { value: 'none', label: '无状态', icon: 'remove-circle-outline', color: Colors.textTertiary },
  { value: 'success', label: '成功', icon: 'checkmark-circle', color: Colors.success },
  { value: 'attempt', label: '尝试', icon: 'sync-circle', color: Colors.primary },
];

export default function UploadScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [selectedDate, setSelectedDate] = useState(params.date ?? todayString());
  const [locationId, setLocationId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<MediaStatus>('none');
  const [assets, setAssets] = useState<SelectedAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { locations, addLocation } = useLocations();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickMediaNative = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('请在系统设置中允许访问相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
      videoMaxDuration: 600,
      legacy: true,
    });

    if (result.canceled || !result.assets.length) return;

    const newAssets: SelectedAsset[] = result.assets.map(a => ({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'photo',
      duration: a.duration ? a.duration / 1000 : undefined,
      width: a.width,
      height: a.height,
    }));

    setAssets(prev => [...prev, ...newAssets]);
  }, []);

  const pickMediaWeb = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files) return;
      const newAssets: SelectedAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uri = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        newAssets.push({
          uri,
          type: isVideo ? 'video' : 'photo',
          fileName: file.name,
        });
      }
      setAssets(prev => [...prev, ...newAssets]);
    };
    input.click();
  }, []);

  const pickMedia = Platform.OS === 'web' ? pickMediaWeb : pickMediaNative;

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (assets.length === 0) {
      alert('请先选择照片或视频');
      return;
    }

    setSaving(true);
    try {
      const trimmedTitle = title.trim() || null;
      await addMediaItems(
        assets.map(a => ({
          uri: a.uri,
          type: a.type,
          date: selectedDate,
          location_id: locationId,
          title: trimmedTitle,
          status,
          duration: a.duration ?? null,
          width: a.width ?? null,
          height: a.height ?? null,
        }))
      );
      router.back();
    } catch (error: any) {
      console.error('Save failed:', error);
      const msg = error?.message ?? String(error);
      alert(`保存失败: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>选择日期</Text>
      <Pressable
        style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        <Ionicons
          name={showCalendar ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textSecondary}
        />
      </Pressable>

      {showCalendar && (
        <Calendar
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: Colors.primary },
          }}
          theme={{
            todayTextColor: Colors.primary,
            arrowColor: Colors.primary,
            selectedDayBackgroundColor: Colors.primary,
            textDayFontSize: 14,
            textMonthFontSize: 15,
            textMonthFontWeight: '700',
          }}
          style={styles.calendar}
        />
      )}

      <Text style={styles.sectionLabel}>选择地点</Text>
      <LocationPicker
        locations={locations}
        selectedId={locationId}
        onSelect={(loc) => setLocationId(loc?.id ?? null)}
        onCreateNew={addLocation}
      />

      <Text style={styles.sectionLabel}>标题（可选）</Text>
      <TextInput
        style={styles.titleInput}
        placeholder="最多10个字"
        placeholderTextColor={Colors.textTertiary}
        value={title}
        onChangeText={(t) => setTitle(t.slice(0, 10))}
        maxLength={10}
        returnKeyType="done"
      />

      <Text style={styles.sectionLabel}>状态</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map(opt => {
          const active = status === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.statusOption, active && styles.statusOptionActive]}
              onPress={() => setStatus(opt.value)}
            >
              <Ionicons
                name={opt.icon as any}
                size={20}
                color={active ? opt.color : Colors.textTertiary}
              />
              <Text style={[styles.statusText, active && { color: opt.color }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>
        选择媒体 {assets.length > 0 && `(${assets.length})`}
      </Text>

      <View style={styles.assetsGrid}>
        {assets.map((asset, index) => (
          <View key={index} style={styles.assetItem}>
            {asset.type === 'photo' ? (
              <Image source={{ uri: asset.uri }} style={styles.assetImage} contentFit="cover" />
            ) : (
              <View style={[styles.assetImage, styles.videoPlaceholder]}>
                <Ionicons name="videocam" size={24} color={Colors.white} />
                <Text style={styles.videoLabel}>视频</Text>
              </View>
            )}
            {asset.type === 'video' && (
              <View style={styles.videoTag}>
                <Ionicons name="videocam" size={12} color="white" />
              </View>
            )}
            <Pressable
              style={styles.removeButton}
              onPress={() => removeAsset(index)}
            >
              <Ionicons name="close-circle" size={22} color={Colors.error} />
            </Pressable>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addMediaButton, pressed && styles.pressed]}
          onPress={pickMedia}
        >
          <Ionicons name="add" size={32} color={Colors.primary} />
          <Text style={styles.addMediaText}>选择</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          (saving || assets.length === 0) && styles.saveButtonDisabled,
          pressed && !(saving || assets.length === 0) ? styles.pressed : undefined,
        ]}
        onPress={handleSave}
        disabled={saving || assets.length === 0}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={22} color={Colors.white} />
            <Text style={styles.saveText}>保存 ({assets.length})</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 60,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  calendar: {
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  titleInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  assetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  assetItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    color: Colors.white,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  videoTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  removeButton: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.white,
    borderRadius: 11,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  addMediaText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xxxl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  saveText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
