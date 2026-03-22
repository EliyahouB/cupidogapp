import React from "react";
import { 
  SafeAreaView, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  useColorScheme,
  Platform,
  StatusBar,
  Text
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../contexts/CartContext";
import GradientBackground from "./GradientBackground";
import Header from "./Header";
import Toolbar from "./Toolbar";

// Écrans où on ne veut PAS de flèche retour
const NO_BACK_SCREENS = ["Home", "Welcome", "UserTypeSelect", "AuthMethods"];

export default function ScreenLayout({
  children,
  title,
  navigation,
  showToolbar = true,
  showBack,
  active,
  rightIcon,
  onRightPress,
  onProfile,
  showCart = false,
}) {
  const go = (name) => navigation?.navigate?.(name);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  
  let cartCount = 0;
  try {
    const { getItemsCount } = useCart();
    cartCount = getItemsCount();
  } catch (error) {
    cartCount = 0;
  }

  // Déterminer si on affiche la flèche retour
  // Si showBack est explicitement défini, on le respecte
  // Sinon, on affiche la flèche sauf sur les écrans listés dans NO_BACK_SCREENS
  const shouldShowBack = showBack !== undefined 
    ? showBack 
    : !NO_BACK_SCREENS.includes(title);

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
            onBack={shouldShowBack ? () => navigation?.goBack() : undefined}
            right={() =>
              showCart ? (
                <TouchableOpacity 
                  onPress={() => navigation?.navigate("Cart")} 
                  style={styles.cartButton}
                >
                  <MaterialCommunityIcons name="cart" size={28} color="#003366" />
                  {cartCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : rightIcon === "filter" ? (
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
                onLikes={() => go("LikesHub")}
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
    marginTop: 44,
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  cartButton: {
    padding: 6,
    marginTop: 12,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
});