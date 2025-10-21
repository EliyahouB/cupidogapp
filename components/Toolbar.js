import React from "react";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Toolbar({ onHome, onPaws, onChat, onLikes }) {
  const bottomPad = Platform.OS === "android" ? 12 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#0D47A1", "#42A5F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.bar, { paddingBottom: 10 + bottomPad }]}
      >
        <TouchableOpacity style={styles.btn} onPress={onHome}>
          <MaterialCommunityIcons name="home-outline" size={36} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onPaws}>
          <MaterialCommunityIcons name="paw" size={36} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onChat}>
          <MaterialCommunityIcons name="message-text-outline" size={36} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onLikes}>
          <MaterialCommunityIcons name="heart-outline" size={36} color="#fff" />
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
    alignItems: "center", // ✅ Centrage vertical
    justifyContent: "space-around",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 59,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center", // ✅ Centrage vertical
    paddingVertical: 4,
  },
});
