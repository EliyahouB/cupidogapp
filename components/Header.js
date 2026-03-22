import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Header({ title, onBack, right }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.btn}>
            <MaterialCommunityIcons name="arrow-left" size={36} color="#FF6A3D" />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <View style={styles.center}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
      </View>

      <View style={styles.right}>
        {right ? right() : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "transparent"
  },
  left: {
    width: 56,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 44,
  },
  right: {
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  spacer: {
    width: 28
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff"
  },
  btn: {
    padding: 8,
  },
});