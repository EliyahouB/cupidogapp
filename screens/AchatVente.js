// screens/AchatVente.js
import React from "react";
import { SafeAreaView, Text } from "react-native";
import i18n from "../utils/i18n";

export default function AchatVente() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text>{i18n.t("buy_sell")} (placeholder)</Text>
    </SafeAreaView>
  );
}