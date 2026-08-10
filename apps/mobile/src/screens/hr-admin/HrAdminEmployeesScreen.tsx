import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { getEmployees } from '@/services/employees.service';
import { UserRole } from '@/types/api';
import { Employee, GetEmployeesParams } from '@/types/employee';

export type RoleFilterType = 'SEMUA' | UserRole;
export type StatusFilterType = 'SEMUA' | 'AKTIF' | 'NONAKTIF';

export type RouterPushFn = (opt: Parameters<typeof router.push>[0]) => void;

export interface BadgeConfig {
  text: string;
  isSuccess: boolean;
  textClassName: string;
  badgeClassName: string;
}

export function getStatusAktifBadgeConfig(statusAktif: boolean): BadgeConfig {
  return {
    text: statusAktif ? 'Aktif' : 'Nonaktif',
    isSuccess: statusAktif,
    textClassName: statusAktif ? 'text-emerald-700' : 'text-slate-500',
    badgeClassName: statusAktif
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-slate-100 border-slate-200',
  };
}

export function getWajahTerdaftarBadgeConfig(
  wajahTerdaftar: boolean,
): BadgeConfig {
  return {
    text: wajahTerdaftar ? 'Wajah Terdaftar' : 'Wajah Belum Terdaftar',
    isSuccess: wajahTerdaftar,
    textClassName: wajahTerdaftar ? 'text-emerald-700' : 'text-slate-500',
    badgeClassName: wajahTerdaftar
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-slate-100 border-slate-200',
  };
}

export function buildGetEmployeesParams(
  searchQuery: string,
  roleFilter: RoleFilterType,
  statusFilter: StatusFilterType,
): GetEmployeesParams {
  const trimmed = searchQuery.trim();
  return {
    search: trimmed.length > 0 ? trimmed : undefined,
    role: roleFilter === 'SEMUA' ? undefined : roleFilter,
    statusAktif:
      statusFilter === 'AKTIF'
        ? true
        : statusFilter === 'NONAKTIF'
        ? false
        : undefined,
  };
}

export function navigateToAddEmployee(routerPush: RouterPushFn) {
  routerPush('/(hr-admin)/employee-create' as unknown as Parameters<typeof router.push>[0]);
}

export function navigateToEditEmployee(routerPush: RouterPushFn, id: string) {
  routerPush({
    pathname: '/(hr-admin)/employee-edit',
    params: { id },
  } as unknown as Parameters<typeof router.push>[0]);
}

export default function HrAdminEmployeesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('SEMUA');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('SEMUA');

  const params = buildGetEmployeesParams(searchQuery, roleFilter, statusFilter);

  const {
    data: employees = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['employees', params],
    queryFn: () => getEmployees(params),
  });

  const handleAddEmployee = () => {
    navigateToAddEmployee(router.push);
  };

  const handleEditEmployee = (id: string) => {
    navigateToEditEmployee(router.push, id);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Manajemen Karyawan"
        subtitle="Kelola seluruh akun user karyawan, supervisor, & HR admin"
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Top Action Bar */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-sans-bold text-sm text-slate-800">
            Daftar User & Karyawan
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 active:bg-amber-500"
            onPress={handleAddEmployee}
            testID="button-add-employee"
          >
            <Ionicons name="add-circle-outline" size={18} color="#1E1B16" />
            <Text className="font-sans-bold text-xs text-slate-900">
              Tambah Karyawan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Section */}
        <SectionCard className="mb-4 p-3">
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama atau email..."
            testID="input-search-employee"
            containerClassName="flex-row items-center px-3 py-2 bg-slate-100 rounded-xl mb-3 border border-slate-200"
            inputClassName="p-0"
          />

          {/* Role Filter Chips */}
          <View className="mb-2">
            <Text className="font-sans-semibold text-[11px] text-slate-500 mb-1.5">
              Role:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {(
                [
                  { label: 'Semua', value: 'SEMUA' },
                  { label: 'Karyawan', value: 'KARYAWAN' },
                  { label: 'Supervisor', value: 'SUPERVISOR' },
                  { label: 'HR Admin', value: 'HR_ADMIN' },
                ] as const
              ).map((chip) => {
                const isActive = roleFilter === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    className={`px-2.5 py-1.5 rounded-lg border ${
                      isActive
                        ? 'bg-amber-100 border-amber-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                    onPress={() => setRoleFilter(chip.value)}
                    testID={`filter-role-${chip.value}`}
                  >
                    <Text
                      className={`font-sans-semibold text-[11px] ${
                        isActive ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Status Filter Chips */}
          <View>
            <Text className="font-sans-semibold text-[11px] text-slate-500 mb-1.5">
              Status Akun:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {(
                [
                  { label: 'Semua', value: 'SEMUA' },
                  { label: 'Aktif', value: 'AKTIF' },
                  { label: 'Nonaktif', value: 'NONAKTIF' },
                ] as const
              ).map((chip) => {
                const isActive = statusFilter === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    className={`px-2.5 py-1.5 rounded-lg border ${
                      isActive
                        ? 'bg-amber-100 border-amber-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                    onPress={() => setStatusFilter(chip.value)}
                    testID={`filter-status-${chip.value}`}
                  >
                    <Text
                      className={`font-sans-semibold text-[11px] ${
                        isActive ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* Content Section */}
        {isLoading ? (
          <LoadingState message="Memuat daftar karyawan..." />
        ) : isError ? (
          <ErrorState
            message="Gagal mengambil daftar karyawan."
            onRetry={refetch}
          />
        ) : employees.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Tidak ada karyawan ditemukan"
            description="Coba ubah kata kunci pencarian atau filter Anda."
            testID="empty-state"
          />
        ) : (
          <View className="gap-3">
            {employees.map((item: Employee) => {
              const statusBadge = getStatusAktifBadgeConfig(item.statusAktif);
              const wajahBadge = getWajahTerdaftarBadgeConfig(item.wajahTerdaftar);

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => handleEditEmployee(item.id)}
                  testID={`card-employee-item-${item.id}`}
                >
                  <SectionCard>
                    {/* Header Item: User info & Role Label */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                      <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        <View className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                          <Ionicons
                            name="person"
                            size={18}
                            color={COLORS.muted}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-sans-bold text-sm text-slate-900"
                            numberOfLines={1}
                          >
                            {item.nama}
                          </Text>
                          <Text
                            className="font-sans text-[11px] text-slate-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {item.email}
                          </Text>
                        </View>
                      </View>

                      {/* Role Label (Plain text category badge) */}
                      <View className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <Text className="font-sans-bold text-[10px] text-slate-700 uppercase">
                          {item.role}
                        </Text>
                      </View>
                    </View>

                    {/* 2 Independent Badges Section */}
                    <View className="flex-row items-center justify-between pt-3">
                      {/* Badge 1: statusAktif */}
                      <View
                        className={`px-2.5 py-1 rounded-full border ${statusBadge.badgeClassName}`}
                        testID={`badge-status-aktif-${item.id}`}
                      >
                        <Text
                          className={`font-sans-semibold text-[10px] ${statusBadge.textClassName}`}
                        >
                          {statusBadge.text}
                        </Text>
                      </View>

                      {/* Badge 2: wajahTerdaftar */}
                      <View
                        className={`px-2.5 py-1 rounded-full border ${wajahBadge.badgeClassName}`}
                        testID={`badge-wajah-terdaftar-${item.id}`}
                      >
                        <Text
                          className={`font-sans-semibold text-[10px] ${wajahBadge.textClassName}`}
                        >
                          {wajahBadge.text}
                        </Text>
                      </View>
                    </View>
                  </SectionCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
