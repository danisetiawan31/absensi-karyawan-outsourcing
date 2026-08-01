import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function KaryawanHomeScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white gap-4">
      <Text className="text-[20px] font-bold">Dashboard Karyawan</Text>
      <TouchableOpacity 
        onPress={() => router.push('/(karyawan)/face-registration')}
        className="bg-primary px-4 py-3 rounded-md"
      >
        <Text className="text-white font-bold">Test Face Registration</Text>
      </TouchableOpacity>
    </View>
  );
}
