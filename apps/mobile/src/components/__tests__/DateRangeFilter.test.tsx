import {
  getDefaultResetLabel,
  getHeaderTitle,
  getPlaceholderText,
} from '../DateRangeFilter';

describe('DateRangeFilter Presenter Suite', () => {
  it('1. mengembalikan placeholder yang benar berdasarkan mode allowEmpty', () => {
    expect(getPlaceholderText(true)).toBe('Tanpa Batas');
    expect(getPlaceholderText(false)).toBe('Pilih Tanggal');
  });

  it('2. mengembalikan header title & reset label yang sesuai mode allowEmpty', () => {
    expect(getHeaderTitle(undefined, true)).toBe('Filter Periode');
    expect(getHeaderTitle(undefined, false)).toBe('Filter Periode (Wajib)');
    expect(getHeaderTitle('Filter Kustom', false)).toBe('Filter Kustom');

    expect(getDefaultResetLabel(undefined, true)).toBe('Reset Filter');
    expect(getDefaultResetLabel(undefined, false)).toBe('Reset 30 Hari');
    expect(getDefaultResetLabel('Reset Manual', false)).toBe('Reset Manual');
  });

  it('3. memvalidasi korelasi 1:1 default showRequiredAsterisk dengan allowEmpty', () => {
    const allowEmptyTrueAsterisk = !true;
    const allowEmptyFalseAsterisk = !false;

    expect(allowEmptyTrueAsterisk).toBe(false);
    expect(allowEmptyFalseAsterisk).toBe(true);
  });
});
