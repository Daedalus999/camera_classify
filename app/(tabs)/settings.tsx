import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData } from '../../src/db/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function SettingsScreen() {
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const handleClearData = async () => {
    try {
      await clearAllData();
      setShowClearModal(false);
      setDoneMessage('所有分类数据已清除，请重启应用。');
      setShowDoneModal(true);
    } catch (error: any) {
      setShowClearModal(false);
      setDoneMessage(`清除数据失败: ${error?.message ?? String(error)}`);
      setShowDoneModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.appInfo}>
        <View style={styles.iconContainer}>
          <Ionicons name="camera" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>ClimbSnap</Text>
        <Text style={styles.appVersion}>v1.0.0</Text>
        <Text style={styles.appDesc}>攀岩照片/视频分类管理</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据管理</Text>
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
          onPress={() => setShowClearModal(true)}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: Colors.error }]}>清除所有分类数据</Text>
            <Text style={styles.menuHint}>不会删除手机相册中的原始文件</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>存储说明</Text>
            <Text style={styles.menuHint}>
              所有照片和视频始终保存在手机本地相册中，本应用仅记录分类索引，不进行任何云端上传或文件复制。
            </Text>
          </View>
        </View>
      </View>

      {/* Clear Data Confirm */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={36} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>清除所有数据</Text>
            <Text style={styles.modalMessage}>
              这将删除所有分类记录（不会删除手机相册中的照片和视频）。此操作不可撤销。
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && styles.pressed]}
                onPress={handleClearData}
              >
                <Text style={styles.modalBtnConfirmText}>清除</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Result Modal */}
      <Modal visible={showDoneModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDoneModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalIconContainer}>
              <Ionicons
                name={doneMessage.includes('失败') ? 'close-circle' : 'checkmark-circle'}
                size={36}
                color={doneMessage.includes('失败') ? Colors.error : Colors.success}
              />
            </View>
            <Text style={styles.modalTitle}>提示</Text>
            <Text style={styles.modalMessage}>{doneMessage}</Text>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && styles.pressed]}
              onPress={() => setShowDoneModal(false)}
            >
              <Text style={styles.modalBtnConfirmText}>确定</Text>
            </Pressable>
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
  pressed: {
    opacity: 0.7,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  appVersion: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  appDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  menuHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 16,
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
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
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
