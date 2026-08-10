import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/AsyncStateViews';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchInput } from '@/components/SearchInput';
import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';
import { getSites } from '@/services/sites.service';
import { getSupervisorSites } from '@/services/supervisor-sites.service';
import { Site } from '@/types/site';
import { SupervisorSiteItem } from '@/types/supervisor-site';

// --- Pure Helper Functions ---

export function getSupervisorCountForSite(
  siteId: string,
  supervisorSites: SupervisorSiteItem[],
): number {
  if (!siteId || !Array.isArray(supervisorSites)) return 0;
  return supervisorSites.filter((item) => item.site?.id === siteId).length;
}

export interface SiteStatusBadgeConfig {
  text: string;
  isSuccess: boolean;
  bgClassName: string;
  textClassName: string;
}

export function getSiteStatusBadgeConfig(statusAktif: boolean): SiteStatusBadgeConfig {
  if (statusAktif) {
    return {
      text: 'Aktif',
      isSuccess: true,
      bgClassName: 'bg-emerald-50 border-emerald-200',
      textClassName: 'text-emerald-700',
    };
  }
  return {
    text: 'Nonaktif',
    isSuccess: false,
    bgClassName: 'bg-slate-100 border-slate-200',
    textClassName: 'text-slate-600',
  };
}

export interface SupervisorCountBadgeConfig {
  text: string;
  isWarning: boolean;
  bgClassName: string;
  textClassName: string;
  iconColor: string;
}

export function getSupervisorCountBadgeConfig(
  supervisorCount: number,
): SupervisorCountBadgeConfig {
  if (supervisorCount === 0) {
    return {
      text: 'Belum ada supervisor',
      isWarning: true,
      bgClassName: 'bg-[#FFEDD5] border border-[#FDBA74]',
      textClassName: 'text-[#9A3412] font-sans-bold',
      iconColor: COLORS.warning,
    };
  }
  return {
    text: `${supervisorCount} Supervisor`,
    isWarning: false,
    bgClassName: 'bg-slate-100 border border-transparent',
    textClassName: 'text-slate-600 font-sans-medium',
    iconColor: COLORS.muted,
  };
}

export function filterSites(sites: Site[], searchQuery: string): Site[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return sites;
  return sites.filter(
    (s) =>
      s.nama.toLowerCase().includes(q) || s.alamat.toLowerCase().includes(q),
  );
}

export type RouterPushFn = (
  href: Parameters<typeof router.push>[0],
) => void;

export function navigateToCreateSite(routerPush: RouterPushFn) {
  routerPush('/(hr-admin)/site-create' as unknown as Parameters<typeof router.push>[0]);
}

export function navigateToEditSite(routerPush: RouterPushFn, id: string) {
  routerPush({
    pathname: '/(hr-admin)/site-edit',
    params: { id },
  } as unknown as Parameters<typeof router.push>[0]);
}

// --- Component ---

export default function HrAdminSitesScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Sites
  const {
    data: sites = [],
    isLoading: isLoadingSites,
    isError: isErrorSites,
    refetch: refetchSites,
    isRefetching: isRefetchingSites,
  } = useQuery({
    queryKey: ['sites'],
    queryFn: () => getSites(),
  });

  // Fetch Supervisor Sites Assignments
  const {
    data: supervisorSites = [],
    isLoading: isLoadingSupervisorSites,
    isError: isErrorSupervisorSites,
    refetch: refetchSupervisorSites,
    isRefetching: isRefetchingSupervisorSites,
  } = useQuery({
    queryKey: ['supervisor-sites'],
    queryFn: () => getSupervisorSites(),
  });

  const isLoading = isLoadingSites || isLoadingSupervisorSites;
  const isError = isErrorSites || isErrorSupervisorSites;
  const isRefetching = isRefetchingSites || isRefetchingSupervisorSites;

  const handleRefresh = () => {
    refetchSites();
    refetchSupervisorSites();
  };

  const filteredSites = useMemo(
    () => filterSites(sites, searchQuery),
    [sites, searchQuery],
  );

  // Pre-calculate supervisor counts map
  const supervisorCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    sites.forEach((site) => {
      map[site.id] = getSupervisorCountForSite(site.id, supervisorSites);
    });
    return map;
  }, [sites, supervisorSites]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader title="Lokasi Kerja (Site)" subtitle="Memuat daftar site..." />
        <LoadingState message="Memuat daftar lokasi kerja..." />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader title="Lokasi Kerja (Site)" subtitle="Gagal memuat data" />
        <View className="p-4">
          <ErrorState
            title="Gagal Memuat Site"
            message="Terjadi kesalahan saat memuat data lokasi kerja. Silakan coba lagi."
            onRetry={handleRefresh}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Lokasi Kerja (Site)"
        subtitle="Kelola daftar lokasi & alokasi supervisor"
        rightAction={{
          label: 'Tambah Site',
          icon: 'add',
          onPress: () => navigateToCreateSite(router.push),
          testID: 'button-add-site-header',
        }}
      />

      <View className="flex-1 px-4 pt-3">
        {/* Search Bar */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama site atau alamat..."
          testID="input-search-sites"
          clearTestID="button-clear-search-sites"
          containerClassName="flex-row items-center bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 mb-3 shadow-sm"
        />

        {/* Site List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredSites.length === 0 ? (
            <EmptyState
              title="Belum Ada Site"
              description={
                searchQuery
                  ? 'Tidak ada site yang cocok dengan pencarian Anda.'
                  : 'Belum ada lokasi kerja yang terdaftar.'
              }
              actionButton={{
                label: 'Tambah Site',
                icon: 'add-circle-outline',
                onPress: () => navigateToCreateSite(router.push),
                testID: 'button-empty-add-site',
              }}
            />
          ) : (
            filteredSites.map((site) => {
              const supervisorCount = supervisorCountsMap[site.id] || 0;
              const badgeConfig = getSiteStatusBadgeConfig(site.statusAktif);
              const supervisorBadgeConfig = getSupervisorCountBadgeConfig(supervisorCount);

              return (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => navigateToEditSite(router.push, site.id)}
                  activeOpacity={0.7}
                  testID={`site-card-${site.id}`}
                >
                  <SectionCard className="p-4 mb-3">
                    <View className="flex-row items-start justify-between mb-1.5">
                      <View className="flex-1 pr-2">
                        <Text
                          className="font-sans-bold text-sm text-slate-900 mb-0.5"
                          numberOfLines={1}
                        >
                          {site.nama}
                        </Text>
                        <Text
                          className="font-sans text-xs text-slate-500 leading-4"
                          numberOfLines={2}
                        >
                          {site.alamat}
                        </Text>
                      </View>

                      {/* Status Aktif Badge */}
                      <View
                        className={`px-2 py-0.5 rounded-full border ${badgeConfig.bgClassName}`}
                        testID={`badge-status-${site.id}`}
                      >
                        <Text
                          className={`font-sans-semibold text-[10px] ${badgeConfig.textClassName}`}
                        >
                          {badgeConfig.text}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata Row: Radius & Supervisor Count */}
                    <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                      {/* Radius Toleransi Badge */}
                      <View className="flex-row items-center bg-slate-100 px-2 py-1 rounded-md">
                        <Ionicons name="navigate-outline" size={12} color="#475569" />
                        <Text className="font-sans-medium text-[11px] text-slate-600 ml-1">
                          Radius {site.radiusToleransi}m
                        </Text>
                      </View>

                      {/* Supervisor Count Badge */}
                      <View
                        className={`flex-row items-center px-2 py-1 rounded-md ${supervisorBadgeConfig.bgClassName}`}
                        testID={`badge-supervisor-count-${site.id}`}
                      >
                        <Ionicons
                          name="people-outline"
                          size={12}
                          color={supervisorBadgeConfig.iconColor}
                        />
                        <Text
                          className={`text-[11px] ml-1 ${supervisorBadgeConfig.textClassName}`}
                        >
                          {supervisorBadgeConfig.text}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#94A3B8"
                        style={{ marginLeft: 'auto' }}
                      />
                    </View>
                  </SectionCard>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
