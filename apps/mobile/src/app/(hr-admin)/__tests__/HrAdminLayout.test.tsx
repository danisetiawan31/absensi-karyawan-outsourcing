import HrAdminLayout from '../_layout';

describe('HrAdminLayout Tabs Scaffold', () => {
  it('harus mengekspor komponen HrAdminLayout sebagai fungsi komulatif', () => {
    expect(HrAdminLayout).toBeDefined();
    expect(typeof HrAdminLayout).toBe('function');
  });
});
