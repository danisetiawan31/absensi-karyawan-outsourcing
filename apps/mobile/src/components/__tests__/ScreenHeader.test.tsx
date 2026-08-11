import { ScreenHeader } from '../ScreenHeader';

describe('ScreenHeader Component Suite', () => {
  it('harus merender title dan subtitle', () => {
    const headerEl = ScreenHeader({
      title: 'Riwayat Izin & Cuti',
      subtitle: 'Daftar permohonan izin',
    });

    expect(headerEl.props.testID).toBe('screen-header');
    const titleContainer = headerEl.props.children[0];
    expect(titleContainer.props.children[0].props.children).toBe(
      'Riwayat Izin & Cuti',
    );
    expect(titleContainer.props.children[1].props.children).toBe(
      'Daftar permohonan izin',
    );
  });

  it('harus merender tanpa subtitle jika subtitle undefined', () => {
    const headerEl = ScreenHeader({ title: 'Riwayat Izin & Cuti' });
    const titleContainer = headerEl.props.children[0];
    expect(titleContainer.props.children[1]).toBeUndefined();
  });

  it('harus merender rightAction dan memanggil onPress saat ditekan', () => {
    const handleAction = jest.fn();
    const headerEl = ScreenHeader({
      title: 'Riwayat Izin & Cuti',
      rightAction: {
        label: 'Ajukan Izin',
        icon: 'add',
        onPress: handleAction,
        testID: 'button-create-leave-request',
      },
    });

    const rightBtn = headerEl.props.children[1];
    expect(rightBtn.props.testID).toBe('button-create-leave-request');
    rightBtn.props.onPress();
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('harus merender tanpa rightAction jika rightAction undefined', () => {
    const headerEl = ScreenHeader({ title: 'Riwayat Izin & Cuti' });
    expect(headerEl.props.children[1]).toBeUndefined();
  });

  it('harus merender avatar profil inisial jika profileInitials dan onProfilePress diberikan', () => {
    const handleProfile = jest.fn();
    const headerEl = ScreenHeader({
      title: 'Dashboard Supervisor',
      profileInitials: 'SU',
      onProfilePress: handleProfile,
    });

    const profileBtn = headerEl.props.children[1];
    expect(profileBtn.props.testID).toBe('button-header-profile');
    expect(profileBtn.props.children.props.children).toBe('SU');
    profileBtn.props.onPress();
    expect(handleProfile).toHaveBeenCalledTimes(1);
  });
});
