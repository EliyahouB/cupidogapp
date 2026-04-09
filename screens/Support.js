import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import i18n from "../utils/i18n";

export default function Support({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("fill_all_fields"));
      return;
    }

    setSending(true);

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "supportMessages"), {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        userId: user?.uid || null,
        createdAt: new Date(),
        status: "nouveau",
      });

      Alert.alert(
        i18n.t("message_sent"),
        i18n.t("message_sent_desc"),
        [
          {
            text: i18n.t("ok"),
            onPress: () => {
              setName("");
              setEmail("");
              setMessage("");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("error_sending_message"));
      console.log("Erreur envoi message support:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenLayout title={i18n.t("support")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t("your_name")}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t("full_name")}
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>{i18n.t("your_email")}</Text>
          <TextInput
            style={styles.input}
            placeholder="email@exemple.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>{i18n.t("your_message")}</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder={i18n.t("describe_problem")}
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
          />
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#FF6B35" />
            <Text style={styles.infoTitle}>{i18n.t("before_contact")}</Text>
          </View>
          <Text style={styles.infoText}>• {i18n.t("check_help_center")}</Text>
          <Text style={styles.infoText}>• {i18n.t("check_connection")}</Text>
          <Text style={styles.infoText}>• {i18n.t("response_time")}</Text>
        </View>

        <TouchableOpacity
          style={styles.sendButtonContainer}
          onPress={handleSendMessage}
          disabled={sending}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={sending ? ["#9CA3AF", "#6B7280"] : ["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"]}
            style={styles.sendButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="send" size={20} color="#FFF" />
            <Text style={styles.sendButtonText}>
              {sending ? i18n.t("sending") : i18n.t("send_message")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#FFF",
    color: "#1A1A1D",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageInput: {
    height: 120,
    paddingTop: 14,
  },
  infoBox: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#003366",
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 20,
  },
  sendButtonContainer: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});