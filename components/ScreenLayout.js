import React from "react";
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import GradientBackground from "./GradientBackground";
import Header from "./Header";
import Toolbar from "./Toolbar";

export default function ScreenLayout({
  children,
  title,
  navigation,
  showToolbar = true,
  showBack = false,
  active,
  rightIcon,
  onRightPress,
  onProfile,
}) {
  const go = (name) => navigation?.navigate?.(name);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <Header
          title={title}
          onBack={showBack ? () => navigation?.goBack() : undefined}
          right={() =>
            rightIcon === "filter" ? (
              <TouchableOpacity onPress={onRightPress} style={styles.rightBtn}>
                <Image
                  source={{
                    uri: "https://copilot.microsoft.com/th/id/BCO.458f28dc-6e90-4d12-9528-477267ccc2df.png",
                  }}
                  style={styles.icon}
                />
              </TouchableOpacity>
            ) : null
          }
        />
        <View style={styles.content}>{children}</View>
        {showToolbar ? (
          <Toolbar
            onHome={() => go("Home")}
            onPaws={() => go("MesChiens")}
            onChat={() => go("Chat")}
            onLikes={() => go("Likes")}
            onProfile={onProfile || (() => go("Profile"))}
            active={active}
          />
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 },
  rightBtn: {
    padding: 6,
    marginTop: 12,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
