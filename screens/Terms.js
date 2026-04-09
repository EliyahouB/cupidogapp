import React from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";

export default function Terms({ navigation }) {
  return (
    <ScreenLayout title={i18n.t("terms_short")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📄 {i18n.t("terms_title")}</Text>
        <Text style={styles.subtitle}>CupiDog</Text>

        <Text style={styles.section}>{i18n.t("terms_section1")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_1_1")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_1_2")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_1_3")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_1_4")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_1_5")}</Text>

        <Text style={styles.section}>{i18n.t("terms_section2")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_2_1")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_2_2")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_2_3")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_2_4")}</Text>

        <Text style={styles.section}>{i18n.t("terms_section3")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_3_1")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_3_2")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_3_3")}</Text>

        <Text style={styles.section}>{i18n.t("terms_section4")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_4_1")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_4_2")}</Text>
        <Text style={styles.text}>• {i18n.t("terms_4_3")}</Text>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ff914d",
    marginBottom: 20,
  },
  section: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#e0e0e0",
    marginBottom: 6,
    lineHeight: 20,
  },
});