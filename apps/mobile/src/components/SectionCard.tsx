/**
 * SectionCard — container card sesuai konvensi DESIGN.md § Komponen Kunci.
 *
 * bg surface, border 1px border, radius lg (12px), shadow-sm.
 * Opsional: accent border kiri (accentLeft) untuk card yang perlu penanda status.
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

interface SectionCardProps extends ViewProps {
  children: React.ReactNode;
  /** Tambah border kiri berwarna — pakai token warna Tailwind (mis. 'border-l-primary') */
  accentLeft?: string;
  className?: string;
}

export function SectionCard({
  children,
  accentLeft,
  className = '',
  ...rest
}: SectionCardProps) {
  const accentClass = accentLeft ? `border-l-4 ${accentLeft}` : '';

  return (
    <View
      className={`rounded-xl border border-border bg-surface p-4 shadow-sm mb-3 ${accentClass} ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
