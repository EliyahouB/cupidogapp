import React from "react";
import { 
  SafeAreaView, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  useColorScheme,
  Platform,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={isDark ? "#000" : "#fff"} 
      />
      <View 
        style={[
          styles.statusBarBackground, 
          { 
            backgroundColor: isDark ? "#000" : "#fff",
            height: insets.top
          }
        ]} 
      />
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
          {showToolbar && (
            <View style={{ paddingBottom: insets.bottom }}>
              <Toolbar
                onHome={() => go("Home")}
                onPaws={() => go("MesChiens")}
                onChat={() => go("Conversations")}
                onLikes={() => go("Likes")}
                onProfile={onProfile || (() => go("ProfileMenu"))}
                active={active}
              />
            </View>
          )}
        </SafeAreaView>
      </GradientBackground>
      <View 
        style={[
          styles.bottomBarBackground, 
          { 
            backgroundColor: isDark ? "#000" : "#fff",
            height: insets.bottom
          }
        ]} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bottomBarBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  safe: { 
    flex: 1, 
    backgroundColor: "transparent" 
  },
  content: { 
    flex: 1 
  },
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