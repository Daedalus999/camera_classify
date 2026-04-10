import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Location } from '../types';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

interface LocationPickerProps {
  locations: Location[];
  selectedId: number | null;
  onSelect: (location: Location | null) => void;
  onCreateNew: (name: string) => Promise<Location | null>;
}

export default function LocationPicker({
  locations,
  selectedId,
  onSelect,
  onCreateNew,
}: LocationPickerProps) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = locations.find(l => l.id === selectedId);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (locations.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('该地点已存在');
      return;
    }
    setCreating(true);
    const loc = await onCreateNew(trimmed);
    setCreating(false);
    if (loc) {
      onSelect(loc);
      setNewName('');
      setVisible(false);
    }
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        onPress={() => setVisible(true)}
      >
        {selected ? (
          <View style={styles.selectedRow}>
            <View style={[styles.dot, { backgroundColor: selected.color }]} />
            <Text style={styles.selectedText}>{selected.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>选择地点</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择地点</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.locationItem,
                !selectedId && styles.locationItemActive,
                pressed && styles.pressed,
              ]}
              onPress={() => { onSelect(null); setVisible(false); }}
            >
              <Ionicons name="location-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.locationName}>不指定地点</Text>
            </Pressable>

            <FlatList
              data={locations}
              keyExtractor={item => item.id.toString()}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.locationItem,
                    item.id === selectedId && styles.locationItemActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => { onSelect(item); setVisible(false); }}
                >
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.locationName}>{item.name}</Text>
                  {item.id === selectedId && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              )}
            />

            <View style={styles.createRow}>
              <TextInput
                style={styles.input}
                placeholder="新建地点名称..."
                placeholderTextColor={Colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  !newName.trim() && styles.createButtonDisabled,
                  pressed && newName.trim() ? styles.pressed : undefined,
                ]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                <Ionicons name="add" size={22} color={Colors.white} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    width: 360,
    maxWidth: '90%',
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  locationItemActive: {
    backgroundColor: Colors.surfaceVariant,
  },
  locationName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as undefined } : {}),
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
});
