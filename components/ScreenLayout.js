// components/ScreenLayout.js
import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import GradientBackground from "./GradientBackground";
import Header from "./Header";
import Toolbar from "./Toolbar";

export default function ScreenLayout({ children, title, navigation, showToolbar = true, showBack = false }) {
  const go = (name) => navigation?.navigate?.(name);
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <Header title={title} onBack={showBack ? () => navigation?.goBack() : undefined} />
        <View style={styles.content}>{children}</View>
        {showToolbar ? <Toolbar onHome={() => go("Home")} onPaws={() => go("MesChiens")} onChat={() => go("Chat")} onLikes={() => go("Likes")} /> : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 }
});
