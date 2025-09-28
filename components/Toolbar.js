// components/Toolbar.js
import React from "react";
import { SafeAreaView, View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";

export default function Toolbar({ onHome, onPaws, onChat, onLikes }) {
  const bottomPad = Platform.OS === "android" ? 12 : 0;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.bar, { paddingBottom: 10 + bottomPad }]}>
        <TouchableOpacity style={styles.btn} onPress={onHome} accessibilityLabel="Home">
          <Text style={styles.icon}>🏠</Text>
          <Text style={styles.label}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onPaws} accessibilityLabel="Paws">
          <Text style={styles.icon}>🐾</Text>
          <Text style={styles.label}>Chiens</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onChat} accessibilityLabel="Chat">
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.label}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onLikes} accessibilityLabel="Likes">
          <Text style={styles.icon}>❤️</Text>
          <Text style={styles.label}>Favoris</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { width: "100%", backgroundColor: "transparent" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "transparent",
    borderTopWidth: 0
  },
  btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  icon: { color: "#fff", fontSize: 20 },
  label: { color: "#fff", fontSize: 10, marginTop: 2 }
});
