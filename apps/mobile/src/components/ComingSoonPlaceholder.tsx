import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface ComingSoonPlaceholderProps {
  judul: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({
  judul,
  iconName = 'construct-outline',
}) => {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-border bg-surface shadow-sm">
        <Ionicons name={iconName} size={36} color="#FFC81E" />
      </View>
      <Text className="mb-2 text-center font-sans-bold text-xl text-foreground">
        {judul}
      </Text>
      <Text className="text-center font-sans text-sm text-muted">
        Fitur ini akan segera hadir pada tahap pengembangan berikutnya.
      </Text>
    </View>
  );
};

export default ComingSoonPlaceholder;
