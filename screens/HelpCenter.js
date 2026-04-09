import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";

export default function HelpCenter({ navigation }) {
  return (
    <ScreenLayout title={i18n.t("help_center")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <MenuItem
          icon="message-text"
          label={i18n.t("contact_support")}
          onPress={() => navigation.navigate("Support")}
        />

        <MenuItem
          icon="file-document"
          label={i18n.t("terms")}
          onPress={() => navigation.navigate("Terms")}
        />

        <MenuItem
          icon="shield-lock"
          label={i18n.t("privacy_policy")}
          onPress={() => navigation.navigate("PrivacyPolicy")}
          hideBorder
        />

        <Text style={styles.sectionTitle}>{i18n.t("faq")}</Text>

        <FAQItem
          question={i18n.t("faq_add_dog_q")}
          answer={i18n.t("faq_add_dog_a")}
        />

        <FAQItem
          question={i18n.t("faq_match_q")}
          answer={i18n.t("faq_match_a")}
        />

        <FAQItem
          question={i18n.t("faq_contact_q")}
          answer={i18n.t("faq_contact_a")}
        />

        <FAQItem
          question={i18n.t("faq_settings_q")}
          answer={i18n.t("faq_settings_a")}
        />

      </ScrollView>
    </ScreenLayout>
  );
}

function MenuItem({ icon, label, onPress, hideBorder }) {
  return (
    <>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuLeft}>
          <MaterialCommunityIcons name={icon} size={24} color="#FF6B35" />
          <Text style={styles.menuLabel}>{label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      {!hideBorder && <View style={styles.separator} />}
    </>
  );
}

function FAQItem({ question, answer }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 52,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});