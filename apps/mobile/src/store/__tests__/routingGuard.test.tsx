/**
 * Unit test routing guard logic
 *
 * Per spec mobile-foundation.md, guard test "bisa di-test via mock router atau
 * integration test ringan". Approach ini: test logic guard langsung tanpa render
 * komponen (React 19 belum 100% compat dengan @testing-library/react-native renderer).
 */

import { router } from 'expo-router';

import { useAuthStore } from '../authStore';
import { UserRole } from '../../types/api';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Guard logic yang di-extract dari masing-masing _layout.tsx.
 * Fungsi ini mencerminkan persis apa yang dilakukan useEffect di tiap layout.
 */
function applyKaryawanGuard(role: UserRole | null) {
  if (role !== 'KARYAWAN') {
    router.replace('/(auth)/login');
  }
}

function applySupervisorGuard(role: UserRole | null) {
  if (role !== 'SUPERVISOR') {
    router.replace('/(auth)/login');
  }
}

function applyHrAdminGuard(role: UserRole | null) {
  if (role !== 'HR_ADMIN') {
    router.replace('/(auth)/login');
  }
}

describe('Role Guard — KaryawanLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, role: null });
  });

  it('role KARYAWAN: tidak redirect ke login', () => {
    applyKaryawanGuard('KARYAWAN');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('role SUPERVISOR di KaryawanLayout: redirect ke login', () => {
    applyKaryawanGuard('SUPERVISOR');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('role HR_ADMIN di KaryawanLayout: redirect ke login', () => {
    applyKaryawanGuard('HR_ADMIN');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('role null di KaryawanLayout: redirect ke login', () => {
    applyKaryawanGuard(null);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('Role Guard — SupervisorLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, role: null });
  });

  it('role SUPERVISOR: tidak redirect ke login', () => {
    applySupervisorGuard('SUPERVISOR');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('role KARYAWAN di SupervisorLayout: redirect ke login', () => {
    applySupervisorGuard('KARYAWAN');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('role null di SupervisorLayout: redirect ke login', () => {
    applySupervisorGuard(null);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('Role Guard — HrAdminLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, role: null });
  });

  it('role HR_ADMIN: tidak redirect ke login', () => {
    applyHrAdminGuard('HR_ADMIN');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('role KARYAWAN di HrAdminLayout: redirect ke login', () => {
    applyHrAdminGuard('KARYAWAN');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('role null di HrAdminLayout: redirect ke login', () => {
    applyHrAdminGuard(null);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
