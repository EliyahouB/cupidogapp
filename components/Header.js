// components/Header.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Header({ title, onBack, right }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? <TouchableOpacity onPress={onBack}><Text style={styles.action}>←</Text></TouchableOpacity> : null}
      </View>
      <View style={styles.center}><Text numberOfLines={1} style={styles.title}>{title}</Text></View>
      <View style={styles.right}>{right ? right() : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, backgroundColor: "transparent" },
  left: { width: 56 },
  center: { flex: 1, alignItems: "center" },
  right: { width: 56, alignItems: "flex-end" },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  action: { color: "#fff", fontSize: 20 }
});
