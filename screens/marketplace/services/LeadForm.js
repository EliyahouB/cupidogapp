import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth } from "../../../config/firebase";
import { createLead } from "../../../utils/marketplace";
import i18n from "../../../utils/i18n";

export default function LeadForm({ route, navigation }) {
  const { service } = route.params;
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: user?.email || "",
    message: "",
  });
  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [loading, setLoading] = useState(false);

  const leadPrice = service.abonnement === "pro_plus" 
    ? service.leadPrices.pro_plus 
    : service.leadPrices.pro;

  const handleSubmit = () => {
    if (!formData.customerName.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("enter_your_name"));
      return;
    }
    if (!formData.customerPhone.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("enter_your_phone"));
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("describe_your_request"));
      return;
    }

    Alert.alert(
      i18n.t("confirm_request"),
      `${i18n.t("by_sending_request")} ${service.businessName} ${i18n.t("will_receive_your_contact")}`,
      [
        { text: i18n.t("cancel"), style: "cancel" },
        { text: i18n.t("send"), onPress: sendLead }
      ]
    );
  };

  const sendLead = async () => {
    setLoading(true);

    try {
      const leadData = {
        serviceId: service.id,
        providerId: service.providerId,
        providerName: service.businessName,
        customerId: user.uid,
        customerName: formData.customerName,
        customerPhone: phonePrefix + formData.customerPhone,
        customerEmail: formData.customerEmail,
        message: formData.message,
        leadPrice: leadPrice,
        serviceCategory: service.category,
      };

      const result = await createLead(leadData);

      if (result.success) {
        Alert.alert(
          i18n.t("request_sent"),
          `${service.businessName} ${i18n.t("received_your_request")}`,
          [
            { 
              text: i18n.t("ok"), 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      } else {
        Alert.alert(i18n.t("error"), i18n.t("error_sending_request"));
      }
    } catch (error) {
      console.error("Erreur sendLead:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryGradient = () => {
    const gradients = {
      veterinaire: ["#1565C0", "#1976D2", "#42A5F5"],
      toiletteur: ["#7B1FA2", "#8E24AA", "#AB47BC"],
      dogwalker: ["#00796B", "#00897B", "#26A69A"],
      educateur: ["#388E3C", "#43A047", "#66BB6A"],
      pension: ["#F57C00", "#FB8C00", "#FFA726"],
      transport: ["#C2185B", "#D81B60", "#EC407A"],
      photographe: ["#E64A19", "#F4511E", "#FF7043"],
    };
    return gradients[service.category] || ["#1976D2", "#42A5F5"];
  };

  return (
    <ScreenLayout title={i18n.t("request_quote")} navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.serviceCard}>
            <LinearGradient
              colors={getCategoryGradient()}
              style={styles.serviceHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.serviceName}>{service.businessName}</Text>
              <Text style={styles.serviceCity}>{service.city}</Text>
            </LinearGradient>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{i18n.t("your_contact_info")}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("full_name")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("full_name_example")}
                value={formData.customerName}
                onChangeText={(text) => setFormData({ ...formData, customerName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("phone")} *</Text>
              <View style={styles.phoneRow}>
                {[
                  { code: "+972", flag: "🇮🇱" },
                  { code: "+33", flag: "🇫🇷" },
                  { code: "+1", flag: "🇺🇸" },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    style={[styles.prefixBtn, phonePrefix === p.code && styles.prefixBtnActive]}
                    onPress={() => setPhonePrefix(p.code)}
                  >
                    <Text style={[styles.prefixText, phonePrefix === p.code && styles.prefixTextActive]}>
                      {p.flag} {p.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("phone_example")}
                keyboardType="phone-pad"
                value={formData.customerPhone}
                onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("email")} ({i18n.t("optional")})</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("email_example")}
                keyboardType="email-address"
                value={formData.customerEmail}
                onChangeText={(text) => setFormData({ ...formData, customerEmail: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("your_request")} *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder={i18n.t("describe_your_need")}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
              />
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={getCategoryGradient()}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.submitButtonText}>{i18n.t("sending")}...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>{i18n.t("send_request")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  serviceCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  serviceCity: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
  },
  form: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#003366",
  },
  phoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  prefixBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  prefixBtnActive: {
    borderColor: "#1976D2",
    backgroundColor: "#E3F2FD",
  },
  prefixText: {
    fontSize: 13,
    color: "#4B5563",
  },
  prefixTextActive: {
    color: "#1976D2",
    fontWeight: "600",
  },
  textarea: {
    minHeight: 100,
    paddingTop: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});