import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import i18n from "../utils/i18n";

export default function GoogleAuthButton({ onPress, loading = false, disabled = false }) {
  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color="#5F6368" />
      ) : (
        <>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path fill="#4285F4" d="M24 12.245c0-.827-.074-1.62-.211-2.382H12.24v4.51h6.617c-.289 1.48-1.14 2.74-2.423 3.583v2.97h3.926c2.3-2.12 3.64-5.24 3.64-8.68z" />
            <Path fill="#34A853" d="M12.24 24c3.29 0 6.05-1.09 8.066-2.954l-3.926-2.97c-1.09.73-2.49 1.16-4.14 1.16-3.18 0-5.87-2.15-6.83-5.04H1.35v3.06C3.35 21.1 7.45 24 12.24 24z" />
            <Path fill="#FBBC05" d="M5.41 14.196a7.2 7.2 0 0 1 0-4.392V6.744H1.35a12 12 0 0 0 0 11.112l4.06-3.66z" />
            <Path fill="#EA4335" d="M12.24 4.77c1.79 0 3.4.615 4.67 1.83l3.5-3.5C18.285 1.19 15.53 0 12.24 0 7.45 0 3.35 2.9 1.35 6.744l4.06 3.06c.96-2.89 3.65-5.034 6.83-5.034z" />
          </Svg>
          <Text style={styles.text}>{i18n.t("continue_with_google")}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 54,
    marginTop: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 28,
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: "#3C4043",
    fontSize: 14,
    fontWeight: "500",
  },
});