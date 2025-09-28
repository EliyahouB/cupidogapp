// components/GradientBackground.js
import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function GradientBackground({ children, style }) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#FF8A65', '#FFB74D', '#FFD54F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 }
});
