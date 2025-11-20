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
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function Support({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
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
        "Message envoyé",
        "Votre message a été envoyé avec succès. Notre équipe vous répondra dans les plus brefs délais.",
        [
          {
            text: "OK",
            onPress: () => {
              setName("");
              setEmail("");
              setMessage("");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'envoyer le message. Réessayez plus tard.");
      console.log("Erreur envoi message support:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenLayout title="Support" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Support CupiDog</Text>
        <Text style={styles.description}>
          Besoin d'aide ? Notre équipe est là pour vous accompagner. Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Votre nom</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Votre email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@exemple.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Votre message</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Décrivez votre problème ou votre question..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
          />

          <TouchableOpacity 
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sending}
          >
            <Text style={styles.sendButtonText}>
              {sending ? "Envoi en cours..." : "📨 Envoyer le message"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Avant de nous contacter</Text>
          <Text style={styles.infoText}>
            • Consultez notre Centre d'aide pour les questions fréquentes
          </Text>
          <Text style={styles.infoText}>
            • Vérifiez votre connexion internet
          </Text>
          <Text style={styles.infoText}>
            • Nous répondons généralement sous 24-48h
          </Text>
        </View>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#ccc",
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  messageInput: {
    height: 120,
    paddingTop: 14,
  },
  sendButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#666",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff914d",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 6,
    lineHeight: 20,
  },
});