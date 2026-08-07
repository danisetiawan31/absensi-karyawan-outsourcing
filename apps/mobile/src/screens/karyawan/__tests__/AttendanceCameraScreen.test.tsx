import {
  getPermissionViewState,
  renderAttendanceCameraScreenDescriptor,
  processAttendanceCapture,
} from '../AttendanceCameraScreen';
import { router, useLocalSearchParams } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    CameraView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest
          .fn()
          .mockResolvedValue({ uri: 'file:///path/to/attendance.jpg' }),
      }));
      return <View testID="mock-camera-view" {...props} />;
    }),
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('expo-location', () => ({
  useForegroundPermissions: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockRouterPush = router.push as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

describe('AttendanceCameraScreen Logic & Descriptor View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({
      jadwalId: 'jadwal-456',
      tipe: 'CHECK_IN',
    });
  });

  describe('getPermissionViewState', () => {
    it('harus mengembalikan SHOW_CAMERA_PERMISSION jika izin kamera ditolak', () => {
      const state = getPermissionViewState(false, true);
      expect(state).toBe('SHOW_CAMERA_PERMISSION');
    });

    it('harus mengembalikan SHOW_LOCATION_PERMISSION jika izin kamera diterima tapi izin lokasi ditolak', () => {
      const state = getPermissionViewState(true, false);
      expect(state).toBe('SHOW_LOCATION_PERMISSION');
    });

    it('harus mengembalikan READY jika kedua izin (kamera dan lokasi) diterima', () => {
      const state = getPermissionViewState(true, true);
      expect(state).toBe('READY');
    });
  });

  describe('renderAttendanceCameraScreenDescriptor (View State & Button Guard)', () => {
    it('2. Izin lokasi denied -> descriptor merender location-permission-denied-view, hasCaptureButton=false, dan TIDAK navigasi ke preview', () => {
      const cameraPermission = { granted: true, canAskAgain: true };
      const locationPermission = { granted: false, canAskAgain: true };

      const descriptor = renderAttendanceCameraScreenDescriptor(
        cameraPermission,
        locationPermission,
      );

      // 1. Membuktikan descriptor merender view khusus izin lokasi ditolak
      expect(descriptor.type).toBe('SHOW_LOCATION_PERMISSION');
      expect(descriptor.testID).toBe('location-permission-denied-view');

      // 2. Membuktikan tombol capture TIDAK dirender (hasCaptureButton = false)
      expect(descriptor.hasCaptureButton).toBe(false);

      // 3. Membuktikan router.push tidak dipanggil
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('harus mengembalikan LOADING jika izin kamera atau lokasi masih null', () => {
      const descriptor = renderAttendanceCameraScreenDescriptor(null, null);
      expect(descriptor.type).toBe('LOADING');
      expect(descriptor.testID).toBe('loading-view');
      expect(descriptor.hasCaptureButton).toBe(false);
    });
  });

  describe('processAttendanceCapture', () => {
    it('1. Izin lokasi granted -> berhasil dapet lokasi & foto, navigasi ke preview dengan param yang benar', async () => {
      const setIsCapturing = jest.fn();
      const setGpsErrorMsg = jest.fn();
      const routerPush = jest.fn();
      const mockTakePictureAsync = jest
        .fn()
        .mockResolvedValue({ uri: 'file:///path/to/attendance.jpg' });

      const mockGetCurrentPositionAsync = jest.fn().mockResolvedValue({
        coords: {
          latitude: -6.2088,
          longitude: 106.8456,
        },
      });

      const cameraRef = {
        current: {
          takePictureAsync: mockTakePictureAsync,
        },
      };

      const result = await processAttendanceCapture({
        cameraRef,
        isCapturing: false,
        setIsCapturing,
        setGpsErrorMsg,
        getCurrentPositionAsync: mockGetCurrentPositionAsync,
        routerPush,
        jadwalId: 'jadwal-789',
        tipe: 'CHECK_IN',
      });

      expect(result).toBe(true);
      expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
      expect(mockTakePictureAsync).toHaveBeenCalled();
      expect(setGpsErrorMsg).toHaveBeenLastCalledWith(null);
      expect(routerPush).toHaveBeenCalledWith({
        pathname: '/(karyawan)/attendance-preview',
        params: {
          photoUri: 'file:///path/to/attendance.jpg',
          latitude: '-6.2088',
          longitude: '106.8456',
          jadwalId: 'jadwal-789',
          tipe: 'CHECK_IN',
        },
      });
    });

    it('3. GPS gagal/timeout -> set error lokasi yang berbeda dari denied, TIDAK navigasi ke preview', async () => {
      const setIsCapturing = jest.fn();
      const setGpsErrorMsg = jest.fn();
      const routerPush = jest.fn();
      const mockTakePictureAsync = jest.fn();

      const mockGetCurrentPositionAsync = jest
        .fn()
        .mockRejectedValue(new Error('Location provider error / disabled'));

      const cameraRef = {
        current: {
          takePictureAsync: mockTakePictureAsync,
        },
      };

      const result = await processAttendanceCapture({
        cameraRef,
        isCapturing: false,
        setIsCapturing,
        setGpsErrorMsg,
        getCurrentPositionAsync: mockGetCurrentPositionAsync,
        routerPush,
        jadwalId: 'jadwal-789',
        tipe: 'CHECK_IN',
      });

      expect(result).toBe(false);
      expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
      expect(mockTakePictureAsync).not.toHaveBeenCalled();
      expect(setGpsErrorMsg).toHaveBeenCalledWith(
        'Gagal mendapatkan lokasi GPS. Pastikan GPS perangkat Anda aktif.',
      );
      expect(routerPush).not.toHaveBeenCalled();
    });
  });
});
