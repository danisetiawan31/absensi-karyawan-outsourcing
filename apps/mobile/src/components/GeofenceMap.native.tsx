import React from 'react';
import MapView, { Circle, Marker } from 'react-native-maps';

export interface GeofenceMapProps {
  mapRef?: React.RefObject<MapView | null>;
  latitude: number;
  longitude: number;
  radius: number;
  title?: string;
  onDragEnd: (latitude: number, longitude: number) => void;
  fillColor: string;
  strokeColor: string;
}

export function GeofenceMap({
  mapRef,
  latitude,
  longitude,
  radius,
  title,
  onDragEnd,
  fillColor,
  strokeColor,
}: GeofenceMapProps) {
  return (
    <MapView
      ref={mapRef}
      style={{ width: '100%', height: '100%' }}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
      testID="map-view-site"
    >
      <Marker
        coordinate={{ latitude, longitude }}
        draggable
        onDragEnd={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          onDragEnd(lat, lng);
        }}
        title={title || 'Lokasi Site'}
        testID="map-marker-site"
      />
      <Circle
        center={{ latitude, longitude }}
        radius={radius}
        fillColor={fillColor}
        strokeColor={strokeColor}
        strokeWidth={2}
        testID="map-circle-site"
      />
    </MapView>
  );
}

export default GeofenceMap;
