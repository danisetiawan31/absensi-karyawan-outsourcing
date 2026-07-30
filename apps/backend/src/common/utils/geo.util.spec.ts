import { haversineDistance } from './geo.util';

describe('haversineDistance', () => {
  it('should return 0 for identical coordinates', () => {
    const lat = -6.2;
    const lon = 106.816666;
    expect(haversineDistance(lat, lon, lat, lon)).toBe(0);
  });

  it('should calculate correct distance between Monas and GBK (approx 5km)', () => {
    const monasLat = -6.175392;
    const monasLon = 106.827153;
    const gbkLat = -6.218335;
    const gbkLon = 106.802216;

    const distance = haversineDistance(monasLat, monasLon, gbkLat, gbkLon);

    // Distance should be around 5.5 km (5500 meters)
    expect(distance).toBeGreaterThan(5000);
    expect(distance).toBeLessThan(6000);
  });

  it('should calculate realistic long distance (Jakarta to Bandung)', () => {
    const jktLat = -6.2088;
    const jktLon = 106.8456;
    const bdgLat = -6.9175;
    const bdgLon = 107.6191;

    const distance = haversineDistance(jktLat, jktLon, bdgLat, bdgLon);

    // Distance is around 110-120 km
    expect(distance).toBeGreaterThan(100000);
    expect(distance).toBeLessThan(150000);
  });
});
