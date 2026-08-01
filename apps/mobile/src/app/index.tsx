import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-[24px] font-bold">Absensi Karyawan</Text>
        <Text className="text-[16px] text-muted-foreground">Expo SDK 54 ✅</Text>
      </View>
    </SafeAreaView>
  );
}
