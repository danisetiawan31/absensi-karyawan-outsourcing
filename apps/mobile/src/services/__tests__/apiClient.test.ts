import { router } from "expo-router";
import MockAdapter from "axios-mock-adapter";

import apiClient from "../apiClient";
import { useAuthStore } from "../../store/authStore";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

describe("apiClient Interceptors", () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, role: null });
    // Setup mock adapter untuk apiClient instance
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  it("menyertakan header Authorization jika token tersedia di authStore", async () => {
    // Setup state
    useAuthStore.setState({ accessToken: "test-token-123" });

    // Mock endpoint success
    mockAxios.onGet("/test-auth").reply(200, { success: true });

    const response = await apiClient.get("/test-auth");

    expect(response.status).toBe(200);
    // Verifikasi header
    expect(response.config.headers["Authorization"]).toBe(
      "Bearer test-token-123",
    );
  });

  it("tidak menyertakan header Authorization jika token tidak ada", async () => {
    // Setup state kosong
    useAuthStore.setState({ accessToken: null });

    // Mock endpoint success
    mockAxios.onGet("/test-no-auth").reply(200, { success: true });

    const response = await apiClient.get("/test-no-auth");

    expect(response.status).toBe(200);
    // Verifikasi header
    expect(response.config.headers["Authorization"]).toBeUndefined();
  });

  it("membersihkan store dan redirect ke login jika menerima response 401", async () => {
    // Spy on clearAuth
    const clearAuthSpy = jest.spyOn(useAuthStore.getState(), "clearAuth");

    // Setup state
    useAuthStore.setState({ accessToken: "expired-token" });

    // Mock endpoint reject 401
    mockAxios
      .onGet("/test-401")
      .reply(401, { success: false, message: "Unauthorized" });

    await expect(apiClient.get("/test-401")).rejects.toThrow();

    // Verifikasi clearAuth dipanggil
    expect(clearAuthSpy).toHaveBeenCalled();
    // Verifikasi router.replace ke login dipanggil
    expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("tidak clearAuth atau redirect jika error selain 401", async () => {
    // Spy on clearAuth
    const clearAuthSpy = jest.spyOn(useAuthStore.getState(), "clearAuth");

    useAuthStore.setState({ accessToken: "valid-token" });

    // Mock endpoint reject 500
    mockAxios
      .onGet("/test-500")
      .reply(500, { success: false, message: "Server Error" });

    await expect(apiClient.get("/test-500")).rejects.toThrow();

    // Verifikasi clearAuth TIDAK dipanggil
    expect(clearAuthSpy).not.toHaveBeenCalled();
    // Verifikasi router.replace TIDAK dipanggil
    expect(router.replace).not.toHaveBeenCalled();
  });
});
