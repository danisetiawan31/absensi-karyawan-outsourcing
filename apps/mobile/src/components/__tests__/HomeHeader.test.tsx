import { HomeHeader } from '../HomeHeader';

describe('HomeHeader Component Suite', () => {
  it('harus merender sapaan default dan nama pengguna', () => {
    const headerEl = HomeHeader({ nama: 'Budi Santoso', role: 'KARYAWAN' });
    expect(headerEl.props.testID).toBe('home-header');
    const textContainer = headerEl.props.children[0];
    expect(textContainer.props.children[0].props.children).toBe('Selamat Datang');
    expect(textContainer.props.children[1].props.children).toEqual([
      'Halo, ',
      'Budi Santoso',
    ]);
  });

  it('harus merender avatar profil inisial BS', () => {
    const headerEl = HomeHeader({ nama: 'Budi Santoso', role: 'KARYAWAN' });
    const avatarBtn = headerEl.props.children[1];
    expect(avatarBtn.props.testID).toBe('button-avatar-profile');
    expect(avatarBtn.props.children.props.children).toBe('BS');
  });
});
