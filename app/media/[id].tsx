import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../../src/components/VideoPlayer';
import LocationPicker from '../../src/components/LocationPicker';
import { getMediaById, deleteMediaItem, updateMediaItem } from '../../src/db/database';
import { useLocations } from '../../src/hooks/useLocations';
import { MediaItem, MediaStatus } from '../../src/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_OPTIONS: { value: MediaStatus; label: string; icon: string; color: string }[] = [
  { value: 'none', label: '无状态', icon: 'remove-circle-outline', color: Colors.textTertiary },
  { value: 'success', label: '成功', icon: 'checkmark-circle', color: Colors.success },
  { value: 'attempt', label: '尝试', icon: 'sync-circle', color: Colors.primary },
];

export default function MediaViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<MediaStatus>('none');
  const [editLocationId, setEditLocationId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { locations, addLocation } = useLocations();

  const loadItem = useCallback(async () => {
    if (!id) return;
    const media = await getMediaById(Number(id));
    setItem(media);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    await deleteMediaItem(item.id);
    setShowDeleteModal(false);
    router.back();
  }, [item]);

  const openEdit = useCallback(() => {
    if (!item) return;
    setEditTitle(item.title ?? '');
    setEditStatus(item.status);
    setEditLocationId(item.location_id);
    setShowEditModal(true);
  }, [item]);

  const handleSaveEdit = useCallback(async () => {
    if (!item) return;
    setSaving(true);
    try {
      await updateMediaItem(item.id, {
        title: editTitle.trim() || null,
        status: editStatus,
        location_id: editLocationId,
      });
      await loadItem();
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Update failed:', error);
      alert(`保存失败: ${error?.message ?? String(error)}`);
    } finally {
      setSaving(false);
    }
  }, [item, editTitle, editStatus, editLocationId, loadItem]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>媒体文件不存在</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {item.type === 'video' ? (
        <VideoPlayer uri={item.uri} shouldPlay />
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={styles.fullImage}
          contentFit="contain"
          transition={200}
        />
      )}

      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={26} color={Colors.white} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={24} color={Colors.white} />
          </Pressable>
          <Pressable
            onPress={() => setShowInfo(!showInfo)}
            style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
          >
            <Ionicons name="information-circle-outline" size={26} color={Colors.white} />
          </Pressable>
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={24} color={Colors.white} />
          </Pressable>
        </View>
      </View>

      {showInfo && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>详情</Text>
          {!!item.title && (
            <InfoRow label="标题" value={item.title} />
          )}
          {item.status !== 'none' && (
            <InfoRow
              label="状态"
              value={item.status === 'success' ? '成功' : '尝试'}
            />
          )}
          <InfoRow label="类型" value={item.type === 'photo' ? '照片' : '视频'} />
          <InfoRow label="日期" value={item.date} />
          {item.location_name && (
            <InfoRow label="地点" value={item.location_name} />
          )}
          {item.duration != null && (
            <InfoRow label="时长" value={`${Math.round(item.duration)}秒`} />
          )}
          {item.width && item.height && (
            <InfoRow label="尺寸" value={`${item.width} × ${item.height}`} />
          )}
        </View>
      )}

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>删除记录</Text>
            <Text style={styles.modalMessage}>
              仅删除分类记录，不会删除手机相册中的原始文件。
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && styles.pressed]}
                onPress={handleDelete}
              >
                <Text style={styles.modalBtnConfirmText}>删除</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.editHeader}>
              <Text style={styles.editHeaderTitle}>编辑</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.editBody} contentContainerStyle={styles.editBodyContent}>
              <Text style={styles.editLabel}>标题（可选）</Text>
              <TextInput
                style={styles.editInput}
                placeholder="最多10个字"
                placeholderTextColor={Colors.textTertiary}
                value={editTitle}
                onChangeText={(t) => setEditTitle(t.slice(0, 10))}
                maxLength={10}
                returnKeyType="done"
              />

              <Text style={styles.editLabel}>状态</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map(opt => {
                  const active = editStatus === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.statusOption, active && styles.statusOptionActive]}
                      onPress={() => setEditStatus(opt.value)}
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

              <Text style={styles.editLabel}>地点</Text>
              <LocationPicker
                locations={locations}
                selectedId={editLocationId}
                onSelect={(loc) => setEditLocationId(loc?.id ?? null)}
                onCreateNew={addLocation}
              />
            </ScrollView>

            <View style={styles.editFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.editSaveBtn,
                  saving && styles.editSaveBtnDisabled,
                  pressed && !saving ? styles.pressed : undefined,
                ]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.editSaveBtnText}>保存</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  pressed: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  errorText: {
    color: Colors.white,
    fontSize: FontSize.lg,
  },
  backLink: {
    marginTop: Spacing.lg,
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: FontSize.md,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  infoTitle: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
  },
  infoValue: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '500',
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
  editOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  editSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  editHeaderTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  editBody: {
    paddingHorizontal: Spacing.xl,
  },
  editBodyContent: {
    paddingVertical: Spacing.lg,
  },
  editLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  editInput: {
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
  editFooter: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  editSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  editSaveBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
