// components/Toolbar.js
import React from "react";
import { SafeAreaView, View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";

export default function Toolbar({ onHome, onPaws, onChat, onLikes }) {
  const bottomPad = Platform.OS === "android" ? 12 : 0;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.bar, { paddingBottom: 10 + bottomPad }]}>
        <TouchableOpacity style={styles.btn} onPress={onHome}><Text style={styles.icon}>🏠</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onPaws}><Text style={styles.icon}>🐾</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onChat}><Text style={styles.icon}>💬</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onLikes}><Text style={styles.icon}>❤️</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { width: "100%", backgroundColor: "transparent" },
  bar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: "transparent" },
  btn: { flex: 1, alignItems: "center", paddingVertical: 6 },
  icon: { color: "#fff", fontSize: 22 }
});
