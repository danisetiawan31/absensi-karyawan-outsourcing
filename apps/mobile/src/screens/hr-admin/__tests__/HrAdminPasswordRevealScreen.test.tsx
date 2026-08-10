import {
  processConfirmPasswordAcknowledged,
  processCopyPasswordToClipboard,
} from '../HrAdminPasswordRevealScreen';

describe('HrAdminPasswordRevealScreen Logic & Actions', () => {
  describe('processCopyPasswordToClipboard', () => {
    it('harus memanggil copyFn dengan password yang benar dan mengeset status copied to true', async () => {
      const copyFn = jest.fn().mockResolvedValue(true);
      const setCopiedState = jest.fn();

      const result = await processCopyPasswordToClipboard(
        'Pass1234',
        copyFn,
        setCopiedState,
      );

      expect(result).toBe(true);
      expect(copyFn).toHaveBeenCalledWith('Pass1234');
      expect(setCopiedState).toHaveBeenCalledWith(true);
    });

    it('harus mengembalikan false jika copyFn melempar error', async () => {
      const copyFn = jest.fn().mockRejectedValue(new Error('Clipboard error'));
      const setCopiedState = jest.fn();

      const result = await processCopyPasswordToClipboard(
        'Pass1234',
        copyFn,
        setCopiedState,
      );

      expect(result).toBe(false);
      expect(copyFn).toHaveBeenCalledWith('Pass1234');
      expect(setCopiedState).not.toHaveBeenCalled();
    });
  });

  describe('processConfirmPasswordAcknowledged', () => {
    it('harus memanggil invalidateQueriesFn dan navigasi routerReplace ke /(hr-admin)', async () => {
      const invalidateQueriesFn = jest.fn().mockResolvedValue(undefined);
      const routerReplaceFn = jest.fn();

      await processConfirmPasswordAcknowledged(
        invalidateQueriesFn,
        routerReplaceFn,
      );

      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(routerReplaceFn).toHaveBeenCalledWith('/(hr-admin)');
    });
  });
});
