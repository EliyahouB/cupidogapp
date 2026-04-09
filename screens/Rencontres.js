// screens/Rencontres.js
import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import Card from "../components/Card";
import i18n from "../utils/i18n";

export default function Rencontres() {
  const items = [
    { id: 1, title: i18n.t("central_park"), imageUri: null },
    { id: 2, title: i18n.t("morning_walk"), imageUri: null }
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