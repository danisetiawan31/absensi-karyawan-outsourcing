import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertBanner } from "@/components/AlertBanner";
import { ErrorState, LoadingState } from "@/components/AsyncStateViews";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GeofenceMap } from "@/components/GeofenceMap";
import { ModalPickerSheet } from "@/components/ModalPickerSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import { getEmployees } from "@/services/employees.service";
import { createSite, getSites, updateSite } from "@/services/sites.service";
import {
  createSupervisorSite,
  deleteSupervisorSite,
  getSupervisorSites,
} from "@/services/supervisor-sites.service";
import { Employee } from "@/types/employee";
import { CreateSitePayload, Site, UpdateSitePayload } from "@/types/site";
import { SupervisorSiteItem } from "@/types/supervisor-site";

export const DEFAULT_JAKARTA_COORDS = {
  latitude: -6.2088,
  longitude: 106.8456,
};

/**
 * Converts hex color to rgba string with specified opacity.
 * Derived dynamically from design tokens (COLORS.primary).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Pure Helper Functions for Testing & Presenter Logic ---

export function getAssignmentsForSite(
  siteId: string,
  supervisorSites: SupervisorSiteItem[],
): SupervisorSiteItem[] {
  if (!siteId || !Array.isArray(supervisorSites)) return [];
  return supervisorSites.filter((item) => item.site?.id === siteId);
}

export function getAvailableSupervisors(
  allSupervisors: Employee[],
  currentAssignments: SupervisorSiteItem[],
  searchQuery: string = "",
): Employee[] {
  if (!Array.isArray(allSupervisors)) return [];

  const assignedIds = new Set(currentAssignments.map((a) => a.supervisor.id));

  const available = allSupervisors.filter((emp) => !assignedIds.has(emp.id));

  const q = searchQuery.trim().toLowerCase();
  if (!q) return available;

  return available.filter(
    (emp) =>
      emp.nama.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q),
  );
}

export interface FormValidationResult {
  isValid: boolean;
  errorMessage?: string;
  parsedLatitude?: number;
  parsedLongitude?: number;
  parsedRadius?: number;
}

export function validateSiteForm(
  nama: string,
  alamat: string,
  latitudeStr: string,
  longitudeStr: string,
  radiusToleransiStr: string,
): FormValidationResult {
  const trimmedNama = nama.trim();
  const trimmedAlamat = alamat.trim();

  if (!trimmedNama) {
    return { isValid: false, errorMessage: "Nama site tidak boleh kosong." };
  }
  if (!trimmedAlamat) {
    return { isValid: false, errorMessage: "Alamat site tidak boleh kosong." };
  }

  const lat = parseFloat(latitudeStr);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return {
      isValid: false,
      errorMessage: "Latitude harus berupa angka antara -90 dan 90.",
    };
  }

  const lng = parseFloat(longitudeStr);
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return {
      isValid: false,
      errorMessage: "Longitude harus berupa angka antara -180 dan 180.",
    };
  }

  const rad = parseInt(radiusToleransiStr, 10);
  if (isNaN(rad) || rad <= 0) {
    return {
      isValid: false,
      errorMessage:
        "Radius toleransi harus berupa angka positif lebih besar dari 0.",
    };
  }

  return {
    isValid: true,
    parsedLatitude: lat,
    parsedLongitude: lng,
    parsedRadius: rad,
  };
}

export async function getInitialMapCoordinates(
  isEditMode: boolean,
  existingSite?: { latitude: number; longitude: number } | null,
  locationModule = Location,
): Promise<{ latitude: number; longitude: number }> {
  if (isEditMode && existingSite) {
    return {
      latitude: existingSite.latitude,
      longitude: existingSite.longitude,
    };
  }

  try {
    const { status } = await locationModule.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const pos = await locationModule.getCurrentPositionAsync({});
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    }
  } catch {
    // Fallback on permission error/denied
  }

  return DEFAULT_JAKARTA_COORDS;
}

export interface ProcessSiteFormSubmitParams {
  id?: string;
  nama: string;
  alamat: string;
  latitudeStr: string;
  longitudeStr: string;
  radiusToleransiStr: string;
  statusAktif: boolean;
  isSubmittingRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (val: boolean) => void;
  setServerError: (msg: string | null) => void;
  createSiteFn: (payload: CreateSitePayload) => Promise<Site>;
  updateSiteFn: (id: string, payload: UpdateSitePayload) => Promise<Site>;
  invalidateQueriesFn: () => Promise<void> | void;
  onSuccessNav: () => void;
}

export async function processSiteFormSubmit(
  params: ProcessSiteFormSubmitParams,
): Promise<{ success: boolean; errorMessage?: string }> {
  const {
    id,
    nama,
    alamat,
    latitudeStr,
    longitudeStr,
    radiusToleransiStr,
    statusAktif,
    isSubmittingRef,
    setIsSubmitting,
    setServerError,
    createSiteFn,
    updateSiteFn,
    invalidateQueriesFn,
    onSuccessNav,
  } = params;

  if (isSubmittingRef.current) return { success: false };

  const validation = validateSiteForm(
    nama,
    alamat,
    latitudeStr,
    longitudeStr,
    radiusToleransiStr,
  );

  if (!validation.isValid) {
    const msg = validation.errorMessage || "Data form tidak valid.";
    setServerError(msg);
    return { success: false, errorMessage: msg };
  }

  isSubmittingRef.current = true;
  setIsSubmitting(true);
  setServerError(null);

  try {
    if (id) {
      await updateSiteFn(id, {
        nama: nama.trim(),
        alamat: alamat.trim(),
        latitude: validation.parsedLatitude!,
        longitude: validation.parsedLongitude!,
        radiusToleransi: validation.parsedRadius!,
        statusAktif,
      });
    } else {
      await createSiteFn({
        nama: nama.trim(),
        alamat: alamat.trim(),
        latitude: validation.parsedLatitude!,
        longitude: validation.parsedLongitude!,
        radiusToleransi: validation.parsedRadius!,
      });
    }

    await invalidateQueriesFn();
    onSuccessNav();
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal menyimpan data site.";
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setServerError(message);
    return { success: false, errorMessage: message };
  } finally {
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  }
}

export interface ProcessAssignSupervisorParams {
  siteId: string;
  supervisorId: string;
  isAssigningRef: React.MutableRefObject<boolean>;
  setIsAssigning: (val: boolean) => void;
  setAssignError: (msg: string | null) => void;
  createSupervisorSiteFn: (payload: {
    supervisorId: string;
    siteId: string;
  }) => Promise<{ id: string }>;
  invalidateQueriesFn: () => Promise<void> | void;
  refetchSupervisorsFn?: () => Promise<unknown> | void;
  onSuccess: () => void;
}

export async function processAssignSupervisor(
  params: ProcessAssignSupervisorParams,
): Promise<{ success: boolean; errorMessage?: string }> {
  const {
    siteId,
    supervisorId,
    isAssigningRef,
    setIsAssigning,
    setAssignError,
    createSupervisorSiteFn,
    invalidateQueriesFn,
    refetchSupervisorsFn,
    onSuccess,
  } = params;

  if (isAssigningRef.current) return { success: false };

  if (!siteId || !supervisorId) {
    const msg = "Data alokasi supervisor tidak lengkap.";
    setAssignError(msg);
    return { success: false, errorMessage: msg };
  }

  isAssigningRef.current = true;
  setIsAssigning(true);
  setAssignError(null);

  try {
    await createSupervisorSiteFn({ supervisorId, siteId });
    await invalidateQueriesFn();
    onSuccess();
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal mengalokasikan supervisor ke site ini.";
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.error?.code;
      if (code === "ROLE_BUKAN_SUPERVISOR") {
        message = "Pengguna tersebut tidak lagi memiliki role Supervisor.";
      } else {
        message = err.response?.data?.error?.message || message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    setAssignError(message);
    if (refetchSupervisorsFn) {
      await refetchSupervisorsFn();
    }
    return { success: false, errorMessage: message };
  } finally {
    setIsAssigning(false);
    isAssigningRef.current = false;
  }
}

export interface ProcessUnassignSupervisorParams {
  assignmentId: string;
  isUnassigningRef: React.MutableRefObject<boolean>;
  setIsUnassigning: (val: boolean) => void;
  setUnassignError: (msg: string | null) => void;
  deleteSupervisorSiteFn: (
    id: string,
  ) => Promise<{ success: boolean }> | Promise<void>;
  invalidateQueriesFn: () => Promise<void> | void;
  onSuccess: () => void;
}

export async function processUnassignSupervisor(
  params: ProcessUnassignSupervisorParams,
): Promise<{ success: boolean; errorMessage?: string }> {
  const {
    assignmentId,
    isUnassigningRef,
    setIsUnassigning,
    setUnassignError,
    deleteSupervisorSiteFn,
    invalidateQueriesFn,
    onSuccess,
  } = params;

  if (isUnassigningRef.current) return { success: false };

  if (!assignmentId) {
    const msg = "ID alokasi supervisor tidak valid.";
    setUnassignError(msg);
    return { success: false, errorMessage: msg };
  }

  isUnassigningRef.current = true;
  setIsUnassigning(true);
  setUnassignError(null);

  try {
    await deleteSupervisorSiteFn(assignmentId);
    await invalidateQueriesFn();
    onSuccess();
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal menghapus alokasi supervisor.";
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setUnassignError(message);
    return { success: false, errorMessage: message };
  } finally {
    setIsUnassigning(false);
    isUnassigningRef.current = false;
  }
}

// --- Component ---

export default function HrAdminSiteFormScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const isSubmittingRef = useRef(false);
  const isAssigningRef = useRef(false);
  const isUnassigningRef = useRef(false);

  const mapRef = useRef<any>(null);

  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [latitudeStr, setLatitudeStr] = useState("-6.208800");
  const [longitudeStr, setLongitudeStr] = useState("106.845600");
  const [radiusToleransiStr, setRadiusToleransiStr] = useState("75");
  const [statusAktif, setStatusAktif] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const [serverError, setServerError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [unassignError, setUnassignError] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(!isEditMode);

  // Modal Picker State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");

  // Unassign Target State
  const [selectedUnassignTarget, setSelectedUnassignTarget] = useState<{
    id: string;
    nama: string;
  } | null>(null);

  // Fetch Sites data (if Edit mode)
  const {
    data: sites = [],
    isLoading: isLoadingSites,
    isError: isErrorSites,
    refetch: refetchSites,
  } = useQuery({
    queryKey: ["sites"],
    queryFn: () => getSites(),
  });

  const existingSite = isEditMode ? sites.find((site) => site.id === id) : null;

  // Fetch Supervisor-Sites assignments (if Edit mode)
  const { data: supervisorSites = [], isLoading: isLoadingSupervisorSites } =
    useQuery({
      queryKey: ["supervisor-sites"],
      queryFn: () => getSupervisorSites(),
      enabled: isEditMode,
    });

  // Fetch Supervisors List for Picker (if Edit mode & Picker Open)
  const {
    data: allSupervisors = [],
    isLoading: isLoadingSupervisors,
    refetch: refetchSupervisors,
  } = useQuery({
    queryKey: ["employees", "SUPERVISOR"],
    queryFn: () => getEmployees({ role: "SUPERVISOR", statusAktif: true }),
    enabled: isEditMode && isPickerOpen,
  });

  const currentAssignments = useMemo(
    () => (id ? getAssignmentsForSite(id, supervisorSites) : []),
    [id, supervisorSites],
  );

  const availableSupervisors = useMemo(
    () =>
      getAvailableSupervisors(
        allSupervisors,
        currentAssignments,
        pickerSearchQuery,
      ),
    [allSupervisors, currentAssignments, pickerSearchQuery],
  );

  // Initialize Form Data & Map Coordinates
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (isEditMode && existingSite) {
        setNama(existingSite.nama);
        setAlamat(existingSite.alamat);
        setLatitudeStr(existingSite.latitude.toString());
        setLongitudeStr(existingSite.longitude.toString());
        setRadiusToleransiStr(existingSite.radiusToleransi.toString());
        setStatusAktif(existingSite.statusAktif);
        setIsLocating(false);
      } else if (!isEditMode) {
        const coords = await getInitialMapCoordinates(false, null, Location);
        if (isMounted) {
          setLatitudeStr(coords.latitude.toFixed(6));
          setLongitudeStr(coords.longitude.toFixed(6));
          setIsLocating(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, existingSite]);

  // Derived parsed map values for live rendering
  const parsedLat = parseFloat(latitudeStr);
  const parsedLng = parseFloat(longitudeStr);
  const parsedRadius = parseInt(radiusToleransiStr, 10);

  const validLat =
    !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90
      ? parsedLat
      : DEFAULT_JAKARTA_COORDS.latitude;

  const validLng =
    !isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180
      ? parsedLng
      : DEFAULT_JAKARTA_COORDS.longitude;

  const validRadius =
    !isNaN(parsedRadius) && parsedRadius > 0 ? parsedRadius : 75;

  const handleSubmit = () => {
    processSiteFormSubmit({
      id,
      nama,
      alamat,
      latitudeStr,
      longitudeStr,
      radiusToleransiStr,
      statusAktif,
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createSiteFn: createSite,
      updateSiteFn: updateSite,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["sites"] }),
      onSuccessNav: () => router.back(),
    });
  };

  const handleAssignSupervisor = (supervisorId: string) => {
    if (!id) return;

    processAssignSupervisor({
      siteId: id,
      supervisorId,
      isAssigningRef,
      setIsAssigning,
      setAssignError,
      createSupervisorSiteFn: createSupervisorSite,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["supervisor-sites"] }),
      refetchSupervisorsFn: refetchSupervisors,
      onSuccess: () => {
        setIsPickerOpen(false);
        setPickerSearchQuery("");
      },
    });
  };

  const handleConfirmUnassign = () => {
    if (!selectedUnassignTarget) return;

    processUnassignSupervisor({
      assignmentId: selectedUnassignTarget.id,
      isUnassigningRef,
      setIsUnassigning,
      setUnassignError,
      deleteSupervisorSiteFn: deleteSupervisorSite,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["supervisor-sites"] }),
      onSuccess: () => {
        setSelectedUnassignTarget(null);
      },
    });
  };

  if (isEditMode && isLoadingSites) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader title="Edit Site" subtitle="Memuat data site..." />
        <LoadingState message="Memuat data site..." />
      </View>
    );
  }

  if (isEditMode && (isErrorSites || !existingSite)) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader title="Edit Site" subtitle="Gagal memuat data" />
        <View className="p-4">
          <ErrorState
            title="Site Tidak Ditemukan"
            message="Data lokasi kerja tidak dapat ditemukan atau gagal dimuat dari server."
            onRetry={refetchSites}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title={isEditMode ? "Edit Site" : "Tambah Site Baru"}
        subtitle={
          isEditMode
            ? `Ubah data lokasi kerja untuk ${existingSite?.nama}`
            : "Tentukan lokasi & radius toleransi geofencing"
        }
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {serverError && (
          <AlertBanner
            type="error"
            message={serverError}
            testID="banner-site-form-error"
          />
        )}

        <SectionCard className="p-4 gap-4 mb-4">
          <Text className="font-sans-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
            Informasi Site
          </Text>

          {/* Nama Site */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Nama Site <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              placeholder="Contoh: Wisma Atlet Sunter"
              placeholderTextColor="#94A3B8"
              value={nama}
              onChangeText={setNama}
              testID="input-site-nama"
            />
          </View>

          {/* Alamat Site */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Alamat Lengkap <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              placeholder="Contoh: Jl. Sunter Permai Raya No. 1"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              value={alamat}
              onChangeText={setAlamat}
              testID="input-site-alamat"
            />
          </View>

          {/* Status Aktif Toggle (Edit Mode Only) */}
          {isEditMode && (
            <View>
              <Text className="font-sans-semibold text-xs text-slate-700 mb-1.5">
                Status Operasional Site <Text className="text-rose-500">*</Text>
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    statusAktif
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                  onPress={() => setStatusAktif(true)}
                  disabled={isSubmitting}
                  testID="status-chip-site-aktif"
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      statusAktif ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    Aktif
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    !statusAktif
                      ? "bg-slate-200 border-slate-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                  onPress={() => setStatusAktif(false)}
                  disabled={isSubmitting}
                  testID="status-chip-site-nonaktif"
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      !statusAktif ? "text-slate-800" : "text-slate-600"
                    }`}
                  >
                    Nonaktif
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SectionCard>

        {/* Interactive Map Section */}
        <SectionCard className="p-4 gap-3 mb-4">
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
            <Text className="font-sans-bold text-sm text-slate-800">
              Lokasi Geofencing (Map Picker)
            </Text>
            {isLocating && (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text className="font-sans text-[11px] text-slate-500 ml-1">
                  Mencari lokasi...
                </Text>
              </View>
            )}
          </View>

          <Text className="font-sans text-xs text-slate-500 leading-4">
            Geser (drag) marker di atas peta atau masukkan koordinat secara
            manual di bawah. Lingkaran menggambarkan radius toleransi
            geofencing.
          </Text>

          {/* Native MapView / Web Fallback */}
          <View className="h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <GeofenceMap
              mapRef={mapRef}
              latitude={validLat}
              longitude={validLng}
              radius={validRadius}
              title={nama || "Lokasi Site"}
              onDragEnd={(lat, lng) => {
                setLatitudeStr(lat.toFixed(6));
                setLongitudeStr(lng.toFixed(6));
              }}
              fillColor={hexToRgba(COLORS.primary, 0.25)}
              strokeColor={COLORS.primary}
            />
          </View>

          {/* 2-Way Numeric Coordinate & Radius Inputs */}
          <View className="gap-3 mt-1">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                  Latitude (-90 s/d 90) <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                  keyboardType="numeric"
                  value={latitudeStr}
                  onChangeText={(val) => {
                    setLatitudeStr(val);
                    const lat = parseFloat(val);
                    if (
                      !isNaN(lat) &&
                      lat >= -90 &&
                      lat <= 90 &&
                      mapRef.current
                    ) {
                      mapRef.current.animateToRegion(
                        {
                          latitude: lat,
                          longitude: validLng,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        },
                        300,
                      );
                    }
                  }}
                  testID="input-site-latitude"
                />
              </View>

              <View className="flex-1">
                <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                  Longitude (-180 s/d 180){" "}
                  <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                  keyboardType="numeric"
                  value={longitudeStr}
                  onChangeText={(val) => {
                    setLongitudeStr(val);
                    const lng = parseFloat(val);
                    if (
                      !isNaN(lng) &&
                      lng >= -180 &&
                      lng <= 180 &&
                      mapRef.current
                    ) {
                      mapRef.current.animateToRegion(
                        {
                          latitude: validLat,
                          longitude: lng,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        },
                        300,
                      );
                    }
                  }}
                  testID="input-site-longitude"
                />
              </View>
            </View>

            <View>
              <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                Radius Toleransi (Meter){" "}
                <Text className="text-rose-500">*</Text>
              </Text>
              <TextInput
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                keyboardType="number-pad"
                value={radiusToleransiStr}
                onChangeText={setRadiusToleransiStr}
                testID="input-site-radius"
              />
            </View>
          </View>
        </SectionCard>

        {/* Section Supervisor Ter-assign (Edit Mode Only) */}
        {isEditMode && (
          <SectionCard
            className="p-4 gap-3 mb-4"
            testID="section-supervisor-sites"
          >
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="people" size={18} color="#475569" />
                <Text className="font-sans-bold text-sm text-slate-800">
                  Supervisor Ter-assign ({currentAssignments.length})
                </Text>
              </View>

              <TouchableOpacity
                className="flex-row items-center bg-primary px-3 py-1.5 rounded-lg active:bg-primary-hover"
                onPress={() => setIsPickerOpen(true)}
                disabled={isAssigning || isUnassigning}
                testID="button-open-supervisor-picker"
              >
                <Ionicons name="add" size={14} color={COLORS.onPrimary} />
                <Text className="font-sans-bold text-xs text-on-primary ml-1">
                  Tambah
                </Text>
              </TouchableOpacity>
            </View>

            {unassignError && (
              <AlertBanner
                type="error"
                message={unassignError}
                testID="banner-unassign-error"
              />
            )}

            {isLoadingSupervisorSites ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : currentAssignments.length === 0 ? (
              <View className="py-4 items-center bg-slate-50 rounded-xl border border-dashed border-slate-200 px-3">
                <Ionicons
                  name="person-remove-outline"
                  size={24}
                  color="#94A3B8"
                />
                <Text className="font-sans-medium text-xs text-slate-500 text-center mt-1">
                  Belum ada supervisor yang dialokasikan untuk site ini.
                </Text>
              </View>
            ) : (
              <View className="gap-2 mt-1">
                {currentAssignments.map((item) => {
                  const supervisorName = item.supervisor.nama;
                  const supervisorEmail = item.supervisor.email;

                  return (
                    <View
                      key={item.id}
                      className="flex-row items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                      testID={`item-supervisor-assignment-${item.id}`}
                    >
                      <View className="flex-1 pr-2">
                        <Text className="font-sans-bold text-xs text-slate-900 mb-0.5">
                          {supervisorName}
                        </Text>
                        <Text className="font-sans text-[11px] text-slate-500">
                          {supervisorEmail}
                        </Text>
                      </View>

                      <TouchableOpacity
                        className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center active:bg-rose-100"
                        onPress={() =>
                          setSelectedUnassignTarget({
                            id: item.id,
                            nama: supervisorName,
                          })
                        }
                        disabled={isUnassigning}
                        testID={`button-unassign-${item.id}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#DC2626"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
        )}

        {/* Submit Button - Standardized Primary Token Classes */}
        <TouchableOpacity
          className={`py-3.5 rounded-xl bg-primary items-center justify-center mb-6 ${
            isSubmitting ? "opacity-50" : "active:bg-primary-hover"
          }`}
          onPress={handleSubmit}
          disabled={isSubmitting}
          testID="button-submit-site-form"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <Text className="font-sans-bold text-xs text-on-primary">
              {isEditMode ? "Simpan Perubahan Site" : "Tambah Site Baru"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm Modal Unassign */}
      <ConfirmModal
        visible={Boolean(selectedUnassignTarget)}
        variant="warning"
        title="Hapus Alokasi Supervisor"
        description={`Apakah Anda yakin ingin menghapus alokasi supervisor ${selectedUnassignTarget?.nama} dari site ini? Supervisor tidak akan lagi melihat site ini di dashboard/jadwal-nya.`}
        confirmText="Hapus Alokasi"
        cancelText="Batal"
        onConfirm={handleConfirmUnassign}
        onCancel={() => setSelectedUnassignTarget(null)}
        testID="modal-confirm-unassign"
      />

      {/* Modal Picker Tambah Supervisor */}
      <ModalPickerSheet<Employee>
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Pilih Supervisor"
        closeTestID="button-close-picker"
        error={assignError}
        errorTestID="banner-assign-error"
        searchQuery={pickerSearchQuery}
        onSearchQueryChange={setPickerSearchQuery}
        searchPlaceholder="Cari nama atau email supervisor..."
        searchTestID="input-search-supervisor-picker"
        isLoading={isLoadingSupervisors}
        loadingMessage="Memuat daftar supervisor..."
        items={availableSupervisors}
        keyExtractor={(emp) => emp.id}
        emptyTitle="Tidak Ada Supervisor Tersedia"
        emptyDescription={
          pickerSearchQuery
            ? "Tidak ada supervisor yang cocok dengan kata kunci pencarian."
            : "Semua supervisor yang terdaftar sudah dialokasikan ke site ini."
        }
        renderItem={(emp) => (
          <TouchableOpacity
            key={emp.id}
            className="flex-row items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 mb-2 active:bg-slate-100"
            onPress={() => handleAssignSupervisor(emp.id)}
            disabled={isAssigning}
            testID={`item-available-supervisor-${emp.id}`}
          >
            <View className="flex-1 pr-2">
              <Text className="font-sans-bold text-xs text-slate-900 mb-0.5">
                {emp.nama}
              </Text>
              <Text className="font-sans text-[11px] text-slate-500">
                {emp.email}
              </Text>
            </View>
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
