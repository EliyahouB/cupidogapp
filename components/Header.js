import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Header({ title, onBack, right }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.btn}>
            <Text style={styles.icon}>←</Text>
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
    height: 72, // ✅ Augmenté pour laisser plus d’espace vertical
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "transparent"
  },
  left: {
    width: 56,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 44, // ✅ Décalage vers le bas du titre
  },
  right: {
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  spacer: {
    width: 24
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff"
  },
  btn: {
    padding: 6
  },
  icon: {
    color: "#fff",
    fontSize: 20
  }
});
