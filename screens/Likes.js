// screens/Likes.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function Likes({ navigation }) {
  return (
    <ScreenLayout title="Favoris" navigation={navigation}>
      <View style={styles.container}>
        <Text style={styles.text}>Favoris (placeholder)</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  text: { color: "#fff" }
});
