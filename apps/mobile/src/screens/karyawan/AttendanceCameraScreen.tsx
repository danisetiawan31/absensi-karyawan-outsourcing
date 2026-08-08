import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraPictureOptions } from 'expo-camera';
import * as Location from 'expo-location';
import { LocationOptions, LocationObject } from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

export function getPermissionViewState(
  cameraGranted: boolean,
  locationGranted: boolean,
): 'SHOW_CAMERA_PERMISSION' | 'SHOW_LOCATION_PERMISSION' | 'READY' {
  if (!cameraGranted) return 'SHOW_CAMERA_PERMISSION';
  if (!locationGranted) return 'SHOW_LOCATION_PERMISSION';
  return 'READY';
}

export interface AttendanceCameraViewDescriptor {
  type: 'LOADING' | 'SHOW_CAMERA_PERMISSION' | 'SHOW_LOCATION_PERMISSION' | 'READY';
  testID: string;
  hasCaptureButton: boolean;
}

export function renderAttendanceCameraScreenDescriptor(
  cameraPermission: { granted: boolean; canAskAgain?: boolean } | null,
  locationPermission: { granted: boolean; canAskAgain?: boolean } | null,
): AttendanceCameraViewDescriptor {
  if (!cameraPermission || !locationPermission) {
    return {
      type: 'LOADING',
      testID: 'loading-view',
      hasCaptureButton: false,
    };
  }

  const viewState = getPermissionViewState(
    cameraPermission.granted,
    locationPermission.granted,
  );

  if (viewState === 'SHOW_CAMERA_PERMISSION') {
    return {
      type: 'SHOW_CAMERA_PERMISSION',
      testID: 'camera-permission-denied-view',
      hasCaptureButton: false,
    };
  }

  if (viewState === 'SHOW_LOCATION_PERMISSION') {
    return {
      type: 'SHOW_LOCATION_PERMISSION',
      testID: 'location-permission-denied-view',
      hasCaptureButton: false,
    };
  }

  return {
    type: 'READY',
    testID: 'camera-view-container',
    hasCaptureButton: true,
  };
}

export type RouterPushFn = (opt: Parameters<typeof router.push>[0]) => void;

export interface ProcessCaptureOptions {
  cameraRef: { current: { takePictureAsync: (opts?: CameraPictureOptions) => Promise<{ uri?: string }> } | null };
  isCapturing: boolean;
  setIsCapturing: (val: boolean) => void;
  setGpsErrorMsg: (msg: string | null) => void;
  getCurrentPositionAsync: (opts?: LocationOptions) => Promise<LocationObject>;
  routerPush: RouterPushFn;
  jadwalId?: string;
  tipe?: 'CHECK_IN' | 'CHECK_OUT';
}

export async function processAttendanceCapture({
  cameraRef,
  isCapturing,
  setIsCapturing,
  setGpsErrorMsg,
  getCurrentPositionAsync,
  routerPush,
  jadwalId,
  tipe,
}: ProcessCaptureOptions): Promise<boolean> {
  if (!cameraRef.current || isCapturing) return false;

  try {
    setIsCapturing(true);
    setGpsErrorMsg(null);

    // 1. Ambil koordinat GPS
    let location: LocationObject;
    try {
      location = await getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (err: unknown) {
      setGpsErrorMsg('Gagal mendapatkan lokasi GPS. Pastikan GPS perangkat Anda aktif.');
      setIsCapturing(false);
      return false;
    }

    if (!location?.coords) {
      setGpsErrorMsg('Lokasi GPS tidak valid. Silakan coba lagi.');
      setIsCapturing(false);
      return false;
    }

    // 2. Ambil Foto
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.6,
      base64: false,
    });

    if (!photo?.uri) {
      setGpsErrorMsg('Gagal mengambil foto. Silakan coba lagi.');
      setIsCapturing(false);
      return false;
    }

    // 3. Navigasi ke AttendancePreviewScreen
    routerPush({
      pathname: '/(karyawan)/attendance-preview',
      params: {
        photoUri: photo.uri,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        jadwalId: jadwalId || '',
        tipe: tipe || 'CHECK_IN',
      },
    });
    return true;
  } catch (error) {
    setGpsErrorMsg('Terjadi kesalahan saat memproses absensi.');
    return false;
  } finally {
    setIsCapturing(false);
  }
}

export default function AttendanceCameraScreen() {
  const { jadwalId, tipe } = useLocalSearchParams<{
    jadwalId?: string;
    tipe?: 'CHECK_IN' | 'CHECK_OUT';
  }>();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    ) {
      requestCameraPermission();
    }
    if (
      locationPermission &&
      !locationPermission.granted &&
      locationPermission.canAskAgain
    ) {
      requestLocationPermission();
    }
  }, [cameraPermission, locationPermission]);

  const descriptor = renderAttendanceCameraScreenDescriptor(
    cameraPermission,
    locationPermission,
  );

  if (descriptor.type === 'LOADING') {
    return (
      <View className="flex-1 bg-black justify-center items-center" testID="loading-view">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-white font-sans-regular mt-3">
          Memuat izin perangkat...
        </Text>
      </View>
    );
  }

  // Izin kamera ditolak
  if (descriptor.type === 'SHOW_CAMERA_PERMISSION') {
    return (
      <View className="flex-1 bg-black justify-center p-6" testID="camera-permission-denied-view">
        <View className="bg-surface p-6 rounded-2xl items-center">
          <Ionicons name="camera-outline" size={48} color="#000" className="mb-4" />
          <Text className="text-[18px] font-sans-bold text-foreground mb-2 text-center">
            Izin Kamera Diperlukan
          </Text>
          <Text className="text-[14px] font-sans-regular text-muted-foreground text-center mb-6 leading-5">
            Aplikasi memerlukan akses kamera untuk verifikasi wajah saat absensi.
            {cameraPermission?.canAskAgain
              ? ' Silakan berikan izin untuk melanjutkan.'
              : ' Silakan aktifkan izin kamera dari Pengaturan perangkat Anda.'}
          </Text>

          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg w-full items-center"
            onPress={
              cameraPermission?.canAskAgain
                ? requestCameraPermission
                : Linking.openSettings
            }
            testID="button-camera-permission"
          >
            <Text className="text-primary-foreground font-sans-semibold text-[15px]">
              {cameraPermission?.canAskAgain ? 'Berikan Izin Kamera' : 'Buka Pengaturan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Izin lokasi ditolak
  if (descriptor.type === 'SHOW_LOCATION_PERMISSION') {
    return (
      <View className="flex-1 bg-black justify-center p-6" testID="location-permission-denied-view">
        <View className="bg-surface p-6 rounded-2xl items-center">
          <Ionicons name="location-outline" size={48} color="#E11D48" className="mb-4" />
          <Text className="text-[18px] font-sans-bold text-foreground mb-2 text-center">
            Izin Lokasi Diperlukan
          </Text>
          <Text className="text-[14px] font-sans-regular text-muted-foreground text-center mb-6 leading-5">
            Aplikasi memerlukan akses lokasi GPS untuk memvalidasi posisi Anda dengan area site saat presensi.
            {locationPermission?.canAskAgain
              ? ' Silakan berikan izin lokasi untuk melanjutkan.'
              : ' Silakan aktifkan izin lokasi dari Pengaturan perangkat Anda.'}
          </Text>

          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg w-full items-center"
            onPress={
              locationPermission?.canAskAgain
                ? requestLocationPermission
                : Linking.openSettings
            }
            testID="button-location-permission"
          >
            <Text className="text-primary-foreground font-sans-semibold text-[15px]">
              {locationPermission?.canAskAgain ? 'Berikan Izin Lokasi' : 'Buka Pengaturan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = () => {
    processAttendanceCapture({
      cameraRef,
      isCapturing,
      setIsCapturing,
      setGpsErrorMsg,
      getCurrentPositionAsync: Location.getCurrentPositionAsync,
      routerPush: router.push,
      jadwalId,
      tipe,
    });
  };

  return (
    <View className="flex-1 bg-black justify-center" testID="camera-view-container">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="front"
        testID="camera-view"
      />

      {/* Oval Guide Overlay */}
      <View className="absolute inset-0 justify-center items-center pointer-events-none">
        <View className="w-[250px] h-[350px] border-[3px] border-white/70 rounded-[150px] bg-transparent" />
        <Text className="text-white mt-[30px] text-[14px] font-sans-semibold text-center bg-black/50 px-4 py-2 rounded-full overflow-hidden">
          Posisikan wajah Anda di dalam area oval
        </Text>
      </View>

      {/* Banner Error Gagal GPS */}
      {gpsErrorMsg && (
        <View
          className="absolute top-[60px] left-5 right-5 bg-rose-900/90 border border-rose-500 p-4 rounded-xl items-center z-50 shadow-lg"
          testID="gps-error-banner"
        >
          <View className="flex-row items-center mb-1">
            <Ionicons name="alert-circle" size={20} color="#FFD1D1" />
            <Text className="text-white font-sans-bold text-[14px] ml-2">
              Gagal Mendapatkan Lokasi GPS
            </Text>
          </View>
          <Text className="text-rose-100 font-sans-regular text-[12px] text-center mb-3">
            {gpsErrorMsg}
          </Text>
          <TouchableOpacity
            className="bg-white/20 px-4 py-1.5 rounded-lg border border-white/40"
            onPress={() => setGpsErrorMsg(null)}
            testID="button-retry-gps"
          >
            <Text className="text-white font-sans-semibold text-[12px]">
              Coba Lagi
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Capture Button Area - Sumber Tunggal Kebenaran: descriptor.hasCaptureButton */}
      {descriptor.hasCaptureButton && (
        <View className="absolute bottom-[50px] left-0 right-0 items-center">
          <TouchableOpacity
            className={`w-[72px] h-[72px] rounded-full bg-white/30 justify-center items-center ${
              isCapturing ? 'opacity-50' : ''
            }`}
            onPress={handleCapture}
            disabled={isCapturing}
            testID="capture-button"
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <View className="w-[56px] h-[56px] rounded-full bg-white" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
