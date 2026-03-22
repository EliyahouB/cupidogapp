import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Marketplace({ navigation }) {
  useEffect(() => {
    // Redirection immédiate vers MarketplaceHome
    navigation.replace("MarketplaceHome");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#1976D2" />
    </View>
  );
}