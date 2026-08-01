import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";

interface KeyboardScreenProps {
  children: React.ReactNode;
}

// 'padding' behavior bekerja lebih konsisten di Android Expo Go
// dibanding 'height', karena 'height' bergantung pada softInputMode native
// yang hanya bisa dikonfigurasi via dev build (app.json tidak dibaca Expo Go).
const KEYBOARD_VERTICAL_OFFSET =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

export default function KeyboardScreen({ children }: KeyboardScreenProps) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior="padding"
      keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
