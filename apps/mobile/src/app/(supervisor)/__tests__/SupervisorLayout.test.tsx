import SupervisorLayout from '../_layout';

describe('SupervisorLayout Tabs Scaffold', () => {
  it('harus mengekspor komponen SupervisorLayout sebagai fungsi komulatif', () => {
    expect(SupervisorLayout).toBeDefined();
    expect(typeof SupervisorLayout).toBe('function');
  });
});
