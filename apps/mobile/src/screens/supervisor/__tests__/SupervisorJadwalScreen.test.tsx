import SupervisorJadwalScreen from '../SupervisorJadwalScreen';

describe('SupervisorJadwalScreen Component Suite', () => {
  it('harus mengekspor SupervisorJadwalScreen sebagai fungsi komponen React', () => {
    expect(SupervisorJadwalScreen).toBeDefined();
    expect(typeof SupervisorJadwalScreen).toBe('function');
  });
});
