import React, { useState, useEffect } from "react";
import i18n from "../utils/i18n";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { registerForPushNotificationsAsync } from "../utils/Notifications";
import { db } from "../config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function Chat({ route, navigation }) {
  const { ownerId, dogName } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const askPermission = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { pushToken: token }, { merge: true });
        console.log("Token enregistré dans Firestore :", token);
      } else {
        console.log("Utilisateur non connecté, impossible d’enregistrer le token.");
      }
    };

    askPermission();
  }, []);

  const sendPushNotification = async (token, title, body) => {
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization:
          "key=BJ4wZVIk6pQ_0Ceg6zOqoByADadM1GYC1nY9LIZeAz_gEuSlZoYzMVwb3KYZQjEYrTFwO1Hw5D-l_1bb7xSfp8g",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: title,
          body: body,
        },
      }),
    });
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      fromMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    const ownerRef = doc(db, "users", ownerId);
    const ownerSnap = await getDoc(ownerRef);

    if (ownerSnap.exists()) {
      const token = ownerSnap.data().pushToken;
      if (token) {
        await sendPushNotification(token, i18n.t("newMessageTitle"), message);
      } else {
        console.log("Pas de token enregistré pour ce propriétaire.");
      }
    } else {
      console.log("Propriétaire introuvable dans Firestore.");
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.fromMe ? styles.fromMe : styles.fromThem,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <ScreenLayout title={`Discussion - ${dogName}`} navigation={navigation}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={i18n.t("messagePlaceholder")}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>{i18n.t("send")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    padding: 12,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    maxWidth: "80%",
  },
  fromMe: {
    backgroundColor: "#ff914d",
    alignSelf: "flex-end",
  },
  fromThem: {
    backgroundColor: "#444",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#222",
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#ff914d",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
