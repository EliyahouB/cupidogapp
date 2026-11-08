import React from "react";
import {
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  View,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNotificationBadges } from "../contexts/NotificationBadgeContext";

export default function Toolbar({ onHome, onPaws, onChat, onLikes, onProfile, active }) {
  const bottomPad = Platform.OS === "android" ? 8 : 0;
  const { chatUnreadCount, likesUnreadCount } = useNotificationBadges();

  const renderBadge = (count) => count > 0 ? (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#0D47A1", "#42A5F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.bar, { paddingBottom: 6 + bottomPad }]}
      >
        <TouchableOpacity style={styles.btn} onPress={onHome}>
          <MaterialCommunityIcons
            name="home-outline"
            size={28}
            color={active === "home" ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onPaws}>
          <MaterialCommunityIcons
            name="paw"
            size={28}
            color={active === "paw" ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onChat}>
          <MaterialCommunityIcons
            name="chat-outline"
            size={28}
            color={active === "chat" ? "#FFD700" : "#fff"}
          />
          {renderBadge(chatUnreadCount)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onLikes}>
          <MaterialCommunityIcons
            name="heart-outline"
            size={28}
            color={active === "likes" ? "#FFD700" : "#fff"}
          />
          {renderBadge(likesUnreadCount)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onProfile}>
          <MaterialCommunityIcons
            name="account-outline"
            size={28}
            color={active === "profile" ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    width: "100%",
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 50,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  badge: {
    position: "absolute",
    top: -1,
    right: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});