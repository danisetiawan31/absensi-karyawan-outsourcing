import { Ionicons } from '@expo/vector-icons';
import {
  NavigationAction,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';

export type RouterReplaceFn = (
  opt: Parameters<typeof router.replace>[0],
) => void;

export type NavigationBeforeRemoveEvent = {
  preventDefault: () => void;
  data: { action: NavigationAction };
};

export type NavigationWithBeforeRemove = NavigationProp<ParamListBase> & {
  addListener(
    type: 'beforeRemove',
    callback: (e: NavigationBeforeRemoveEvent) => void,
  ): () => void;
};

export async function processCopyPasswordToClipboard(
  password: string,
  copyFn: (str: string) => Promise<boolean>,
  setCopiedState: (val: boolean) => void,
): Promise<boolean> {
  try {
    await copyFn(password);
    setCopiedState(true);
    return true;
  } catch {
    return false;
  }
}

export async function processConfirmPasswordAcknowledged(
  invalidateQueriesFn: () => Promise<void> | void,
  routerReplaceFn: RouterReplaceFn,
): Promise<void> {
  await invalidateQueriesFn();
  routerReplaceFn('/(hr-admin)' as unknown as Parameters<typeof router.replace>[0]);
}

export default function HrAdminPasswordRevealScreen() {
  const queryClient = useQueryClient();
  const rawNavigation = useNavigation();
  const nav = rawNavigation as unknown as NavigationWithBeforeRemove;

  const isAcknowledgedRef = useRef(false);
  const pendingActionRef = useRef<NavigationAction | null>(null);

  const { nama, passwordSementara } = useLocalSearchParams<{
    nama?: string;
    passwordSementara?: string;
  }>();

  const [copied, setCopied] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const displayNama = nama || 'Karyawan';
  const displayPassword = passwordSementara || '--------';

  // Android BackHandler & iOS Swipe-Back / Navigation Interceptor with e.data.action
  useEffect(() => {
    const onBackPress = () => {
      if (isAcknowledgedRef.current) return false;
      setShowExitConfirmModal(true);
      return true; // Block immediate navigation on Android
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    // Cross-platform beforeRemove event listener storing e.data.action
    const unsubscribeBeforeRemove = nav.addListener(
      'beforeRemove',
      (e: NavigationBeforeRemoveEvent) => {
        if (isAcknowledgedRef.current) {
          return;
        }
        e.preventDefault();
        pendingActionRef.current = e.data.action;
        setShowExitConfirmModal(true);
      },
    );

    return () => {
      subscription.remove();
      if (typeof unsubscribeBeforeRemove === 'function') {
        unsubscribeBeforeRemove();
      }
    };
  }, [nav]);

  const handleCopyPassword = async () => {
    await processCopyPasswordToClipboard(
      displayPassword,
      Clipboard.setStringAsync,
      setCopied,
    );
  };

  const handleAcknowledgeAndExit = async () => {
    isAcknowledgedRef.current = true;
    await processConfirmPasswordAcknowledged(
      () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
      router.replace,
    );
  };

  const handleConfirmModalExit = async () => {
    setShowExitConfirmModal(false);
    isAcknowledgedRef.current = true;
    await queryClient.invalidateQueries({ queryKey: ['employees'] });

    if (pendingActionRef.current) {
      nav.dispatch(pendingActionRef.current);
    } else {
      router.replace('/(hr-admin)' as unknown as Parameters<typeof router.replace>[0]);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Password Sementara Dibuat"
        subtitle={`Catat password sementara untuk ${displayNama}`}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Warning Callout */}
        <AlertBanner
          type="warning"
          message="Peringatan Penting: Catat atau salin password ini sekarang. Password ini HANYA ditampilkan SEKALI ini saja dan tidak dapat dilihat lagi setelah Anda keluar dari halaman ini."
          testID="banner-password-warning"
        />

        {/* Password Display Card */}
        <SectionCard className="p-5 items-center mb-4">
          <Text className="font-sans-semibold text-xs text-slate-500 mb-1">
            Akun: <Text className="font-sans-bold text-slate-800">{displayNama}</Text>
          </Text>
          <Text className="font-sans text-xs text-slate-500 mb-4">
            Password Sementara:
          </Text>

          <View className="bg-slate-100 border border-slate-300 rounded-xl px-6 py-3 mb-3 items-center w-full">
            <Text
              className="font-mono font-bold text-2xl text-slate-900 tracking-wider"
              testID="text-password-sementara"
            >
              {displayPassword}
            </Text>
          </View>

          {/* Copy Button */}
          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl border w-full ${
              copied
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-slate-50 border-slate-200 active:bg-slate-100'
            }`}
            onPress={handleCopyPassword}
            testID="button-copy-password"
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? COLORS.success : COLORS.muted}
            />
            <Text
              className={`font-sans-bold text-xs ${
                copied ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              {copied ? 'Password Berhasil Disalin!' : 'Salin Password'}
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Action Confirm & Exit */}
        <TouchableOpacity
          className="py-3.5 rounded-xl bg-amber-400 active:bg-amber-500 items-center justify-center shadow-sm"
          onPress={handleAcknowledgeAndExit}
          testID="button-confirm-copied"
        >
          <Text className="font-sans-bold text-sm text-slate-900">
            Saya Sudah Mencatat Password Ini
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal when attempting back */}
      {showExitConfirmModal && (
        <ConfirmModal
          visible={showExitConfirmModal}
          variant="warning"
          title="Konfirmasi Keluar"
          description={`Apakah Anda yakin ingin keluar? Pastikan Anda sudah mencatat password sementara untuk ${displayNama}.`}
          confirmText="Ya, Keluar"
          cancelText="Batal"
          onConfirm={handleConfirmModalExit}
          onCancel={() => setShowExitConfirmModal(false)}
          testID="modal-confirm-exit"
        />
      )}
    </View>
  );
}
