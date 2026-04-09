// screens/Eleveur.js
import React from "react";
import { SafeAreaView, Text } from "react-native";
import i18n from "../utils/i18n";

export default function Eleveur() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text>{i18n.t("breeder")} (placeholder)</Text>
    </SafeAreaView>
  );
}