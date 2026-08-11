import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { COLORS } from '@/constants/theme';

export interface GeofenceMapProps {
  mapRef?: unknown;
  latitude: number;
  longitude: number;
  radius: number;
  title?: string;
  onDragEnd?: (latitude: number, longitude: number) => void;
  fillColor?: string;
  strokeColor?: string;
}

export function GeofenceMap({
  latitude,
  longitude,
  radius,
  title,
}: GeofenceMapProps) {
  return (
    <View
      className="w-full h-full items-center justify-center bg-slate-100 p-4 border border-dashed border-slate-300 rounded-xl"
      testID="map-view-site"
    >
      <Ionicons name="map-outline" size={32} color={COLORS.slate400} />
      <Text className="font-sans-bold text-xs text-slate-700 text-center mt-2">
        Peta Geofencing ({title || 'Lokasi Site'})
      </Text>
      <Text className="font-sans text-[11px] text-slate-500 text-center mt-1">
        Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)} (Radius: {radius}m)
      </Text>
      <Text className="font-sans text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md mt-2 border border-amber-200">
        Peta interaktif native berjalan di Expo Go (Android / iOS)
      </Text>
    </View>
  );
}

export default GeofenceMap;
