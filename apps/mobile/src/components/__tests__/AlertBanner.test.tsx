import { ALERT_TYPE_CONFIG, AlertBanner } from '../AlertBanner';

describe('AlertBanner Component Suite', () => {
  it('1. harus merender 4 tipe (success, info, warning, error) dengan token warna & icon yang benar', () => {
    const successBanner = AlertBanner({
      type: 'success',
      message: 'Berhasil disimpan.',
    });
    expect(successBanner.props.className).toContain(
      ALERT_TYPE_CONFIG.success.containerClass,
    );

    const infoBanner = AlertBanner({
      type: 'info',
      message: 'Status diperbarui.',
    });
    expect(infoBanner.props.className).toContain(
      ALERT_TYPE_CONFIG.info.containerClass,
    );

    const warningBanner = AlertBanner({
      type: 'warning',
      message: 'Perhatikan tanggal.',
    });
    expect(warningBanner.props.className).toContain(
      ALERT_TYPE_CONFIG.warning.containerClass,
    );

    const errorBanner = AlertBanner({
      type: 'error',
      message: 'Gagal memproses request.',
    });
    expect(errorBanner.props.className).toContain(
      ALERT_TYPE_CONFIG.error.containerClass,
    );
  });

  it('2. harus memanggil onDismiss saat tombol tutup ditekan', () => {
    const handleDismiss = jest.fn();
    const banner = AlertBanner({
      type: 'success',
      message: 'Pesan sukses.',
      onDismiss: handleDismiss,
    });

    const actionContainer = banner.props.children[1];
    const dismissBtn = actionContainer.props.children[1];
    expect(dismissBtn.props.testID).toBe('button-dismiss-alert');
    dismissBtn.props.onPress();
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('3. harus merender & memanggil action.onPress HANYA jika prop action diberikan', () => {
    const handleAction = jest.fn();
    const bannerWithAction = AlertBanner({
      type: 'error',
      message: 'Di luar radius.',
      action: {
        label: 'Lihat Peta',
        onPress: handleAction,
        testID: 'button-view-map',
      },
    });

    const actionContainer = bannerWithAction.props.children[1];
    const actionBtn = actionContainer.props.children[0];
    expect(actionBtn.props.testID).toBe('button-view-map');
    actionBtn.props.onPress();
    expect(handleAction).toHaveBeenCalledTimes(1);

    // Banner tanpa action
    const bannerWithoutAction = AlertBanner({
      type: 'info',
      message: 'Pesan info.',
    });
    const noActionContainer = bannerWithoutAction.props.children[1];
    expect(noActionContainer.props.children[0]).toBeFalsy();
  });
});
