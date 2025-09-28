// screens/MesChiens.js
import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import Card from "../components/Card";

export default function MesChiens() {
  const items = [
    { id: 1, title: "Chien A", imageUri: null },
    { id: 2, title: "Chien B", imageUri: null },
    { id: 3, title: "Chien C", imageUri: null }
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 12, flexDirection: "row", flexWrap: "wrap" }} keyboardShouldPersistTaps="handled">
        {items.map((it) => (
          <Card key={it.id} title={it.title} imageUri={it.imageUri} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
