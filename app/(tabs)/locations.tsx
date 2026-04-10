import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocations } from '../../src/hooks/useLocations';
import { getLocationMediaCount } from '../../src/db/database';
import { Location } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function LocationsScreen() {
  const { locations, refresh, addLocation, editLocation, removeLocation } = useLocations();
  const [newName, setNewName] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({});

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const c: Record<number, number> = {};
        for (const loc of locations) {
          c[loc.id] = await getLocationMediaCount(loc.id);
        }
        setCounts(c);
      })();
    }, [locations])
  );

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (locations.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    await addLocation(trimmed);
    setNewName('');
  };

  const openEdit = (loc: Location) => {
    setEditTarget(loc);
    setEditName(loc.name);
    setEditModalVisible(true);
  };

  const confirmEdit = async () => {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (trimmed && trimmed !== editTarget.name) {
      await editLocation(editTarget.id, trimmed);
    }
    setEditModalVisible(false);
    setEditTarget(null);
  };

  const openDelete = (loc: Location) => {
    setDeleteTarget(loc);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await removeLocation(deleteTarget.id);
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  };

  const renderItem = ({ item }: { item: Location }) => (
    <Pressable
      style={({ pressed }) => [styles.locationCard, pressed && styles.pressed]}
      onPress={() => router.push(`/location/${item.id}`)}
    >
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />
      <View style={styles.locationInfo}>
        <Text style={styles.locationName}>{item.name}</Text>
        <Text style={styles.locationCount}>
          {counts[item.id] ?? 0} 个媒体文件
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => openEdit(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => openDelete(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={locations}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>还没有地点</Text>
            <Text style={styles.emptyText}>在下方输入框添加你常去的攀岩馆</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="添加新地点（如：岩时攀岩馆）"
          placeholderTextColor={Colors.textTertiary}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            !newName.trim() && styles.addButtonDisabled,
            pressed && newName.trim() ? styles.pressed : undefined,
          ]}
          onPress={handleAdd}
          disabled={!newName.trim()}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>编辑地点</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="请输入新名称"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              onSubmitEditing={confirmEdit}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && styles.pressed]}
                onPress={confirmEdit}
              >
                <Text style={styles.modalBtnConfirmText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>删除地点</Text>
            <Text style={styles.modalMessage}>
              确定要删除「{deleteTarget?.name}」吗？{'\n'}已关联的媒体不会被删除，但会取消地点关联。
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && styles.pressed]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalBtnConfirmText}>删除</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {}),
  },
  pressed: {
    opacity: 0.7,
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  locationInfo: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  locationName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  locationCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    paddingRight: Spacing.md,
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: 34,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {}),
  },
  addButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    ...(Platform.OS === 'web' ? { cursor: 'default' as unknown as undefined } : {}),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    width: 320,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as undefined } : {}),
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surfaceVariant,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnDanger: {
    backgroundColor: Colors.error,
  },
  modalBtnCancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  modalBtnConfirmText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
});
