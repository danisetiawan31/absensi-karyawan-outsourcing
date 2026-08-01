import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FaceCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Jika permission masih loading
  if (!permission) {
    return (
      <View className="flex-1 bg-black justify-center">
        <Text className="text-white text-center font-sans-regular">Memuat kamera...</Text>
      </View>
    );
  }

  // Jika permission ditolak
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center">
        <View className="bg-surface m-6 p-6 rounded-2xl items-center">
          <Ionicons name="camera-outline" size={48} color="#000" className="mb-4" />
          <Text className="text-[18px] font-sans-bold text-foreground mb-2 text-center">
            Izin Kamera Diperlukan
          </Text>
          <Text className="text-[14px] font-sans-regular text-muted-foreground text-center mb-6 leading-5">
            Aplikasi memerlukan akses kamera untuk verifikasi wajah saat absensi.
            {permission.canAskAgain
              ? ' Silakan berikan izin untuk melanjutkan.'
              : ' Silakan aktifkan izin kamera dari Pengaturan perangkat Anda.'}
          </Text>
          
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg w-full items-center"
            onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
          >
            <Text className="text-primary-foreground font-sans-semibold text-[15px]">
              {permission.canAskAgain ? 'Berikan Izin' : 'Buka Pengaturan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: false,
      });

      if (photo?.uri) {
        router.push({
          pathname: '/(karyawan)/face-registration-preview',
          params: { photoUri: photo.uri },
        });
      }
    } catch (error) {
      console.error('Gagal mengambil foto:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View className="flex-1 bg-black justify-center">
      <CameraView 
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="front"
      />

      {/* Overlay Container (Absolute) */}
      <View className="absolute inset-0 justify-center items-center pointer-events-none">
        {/* Oval Guide */}
        <View className="w-[250px] h-[350px] border-[3px] border-white/70 rounded-[150px] bg-transparent" />
        <Text className="text-white mt-[30px] text-[14px] font-sans-semibold text-center bg-black/50 px-4 py-2 rounded-full overflow-hidden">
          Posisikan wajah Anda di dalam area oval
        </Text>
      </View>

      {/* Capture Button Area (Absolute) */}
      <View className="absolute bottom-[50px] left-0 right-0 items-center">
        <TouchableOpacity 
          className={`w-[72px] h-[72px] rounded-full bg-white/30 justify-center items-center ${isCapturing ? 'opacity-50' : ''}`}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View className="w-[56px] h-[56px] rounded-full bg-white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
