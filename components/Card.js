// components/Card.js
import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

export default function Card({ title, imageUri }) {
  const source = imageUri ? { uri: imageUri } : require("../assets/placeholder.png");
  return (
    <View style={styles.card}>
      <Image source={source} style={styles.image} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 160, borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", elevation: 3, margin: 8, alignItems: "center" },
  image: { width: 160, height: 120, resizeMode: "cover" },
  title: { padding: 8, fontWeight: "600" }
});
