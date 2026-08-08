import { EmptyState, ErrorState, LoadingState } from '../AsyncStateViews';

describe('AsyncStateViews Component Suite', () => {
  describe('LoadingState', () => {
    it('harus merender props default dan custom message', () => {
      const defaultState = LoadingState({});
      expect(defaultState.props.testID).toBe('loading-state');

      const customState = LoadingState({
        message: 'Memuat data izin...',
        testID: 'custom-loading',
      });
      expect(customState.props.testID).toBe('custom-loading');
    });
  });

  describe('ErrorState', () => {
    it('harus merender props title, message, dan handler onRetry', () => {
      const handleRetry = jest.fn();
      const errorState = ErrorState({
        title: 'Gagal Memuat Data Izin',
        message: 'Koneksi terputus.',
        onRetry: handleRetry,
      });

      expect(errorState.props.testID).toBe('error-state');
      // Execute onRetry handler
      const buttonChild = errorState.props.children[3];
      buttonChild.props.onPress();
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('harus merender tanpa tombol retry jika onRetry undefined', () => {
      const errorState = ErrorState({});
      expect(errorState.props.children[3]).toBeUndefined();
    });
  });

  describe('EmptyState', () => {
    it('harus merender title dan description tanpa actionButton', () => {
      const emptyState = EmptyState({
        title: 'Belum Ada Pengajuan',
        description: 'Silakan buat pengajuan baru.',
      });

      expect(emptyState.props.testID).toBe('empty-state');
      expect(emptyState.props.children[3]).toBeUndefined();
    });

    it('harus merender actionButton dan memanggil onPress saat ditekan', () => {
      const handlePress = jest.fn();
      const emptyState = EmptyState({
        title: 'Belum Ada Data',
        description: 'Klik tombol di bawah.',
        actionButton: {
          label: 'Buat Pengajuan',
          icon: 'add',
          onPress: handlePress,
          testID: 'button-create-action',
        },
      });

      const actionBtn = emptyState.props.children[3];
      expect(actionBtn.props.testID).toBe('button-create-action');
      actionBtn.props.onPress();
      expect(handlePress).toHaveBeenCalledTimes(1);
    });
  });
});
