import { normalizeFeatureName } from './venue-features';

describe('normalizeFeatureName', () => {
  it('trata igual las variantes de escritura de una misma caracteristica', () => {
    const expected = normalizeFeatureName('Wi-Fi');

    for (const variant of ['wifi', 'WI FI', 'Wí-Fi', ' wi_fi ']) {
      expect(normalizeFeatureName(variant)).toBe(expected);
    }
  });

  it('no confunde caracteristicas distintas', () => {
    expect(normalizeFeatureName('Parqueo')).not.toBe(normalizeFeatureName('Parque'));
  });
});
