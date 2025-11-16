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
  Alert,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { registerForPushNotificationsAsync } from "../utils/Notifications";
import { db } from "../config/firebase";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function Chat({ route, navigation }) {
  if (!route.params || !route.params.ownerId || !route.params.dogName) {
    return (
      <ScreenLayout title="Erreur" navigation={navigation} active="chat">
        <Text style={styles.error}>Paramètres manquants pour ouvrir la discussion.</Text>
      </ScreenLayout>
    );
  }

  const { ownerId, dogName } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const askPermission = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || !currentUser) return;

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { pushToken: token }, { merge: true });
    };

    askPermission();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      try {
        const messagesRef = collection(db, "messages");
        const messagesQuery = query(
          messagesRef,
          where("participants", "array-contains", currentUser.uid),
          orderBy("createdAt")
        );
        const snap = await getDocs(messagesQuery);

        const filtered = snap.docs
          .map((doc) => ({ ...doc.data(), docId: doc.id }))
          .filter(
            (msg) =>
              (msg.fromUserId === currentUser.uid && msg.toUserId === ownerId) ||
              (msg.fromUserId === ownerId && msg.toUserId === currentUser.uid)
          )
          .map((msg) => ({
            id: msg.docId,
            text: msg.text,
            fromMe: msg.fromUserId === currentUser.uid,
          }));

        setMessages(filtered);
      } catch (error) {
        console.log("Erreur lors du chargement des messages :", error);
      }
    };

    fetchMessages();
  }, [ownerId]);

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
    if (message.trim() === "" || !currentUser) return;

    const newMessage = {
      text: message,
      fromUserId: currentUser.uid,
      toUserId: ownerId,
      dogName,
      createdAt: new Date(),
      participants: [currentUser.uid, ownerId],
    };

    try {
      const docRef = await addDoc(collection(db, "messages"), newMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: docRef.id,
          text: message,
          fromMe: true,
        },
      ]);
      setMessage("");

      const ownerRef = doc(db, "users", ownerId);
      const ownerSnap = await getDoc(ownerRef);

      if (ownerSnap.exists()) {
        const token = ownerSnap.data().pushToken;
        if (token) {
          await sendPushNotification(token, i18n.t("newMessageTitle"), message);
        }
      }
    } catch (error) {
      console.log("Erreur lors de l'envoi du message :", error);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Supprimer le message", "Confirmer la suppression ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "messages", id));
            setMessages((prev) => prev.filter((msg) => msg.id !== id));
          } catch (error) {
            console.log("Erreur lors de la suppression :", error);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onLongPress={() => item.fromMe && handleDelete(item.id)}
      style={[
        styles.messageBubble,
        item.fromMe ? styles.fromMe : styles.fromThem,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      {item.fromMe && <Text style={styles.deleteHint}>🗑️</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title={`Discussion - ${dogName}`} navigation={navigation} active="chat">
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
    position: "relative",
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
  deleteHint: {
    position: "absolute",
    top: 4,
    right: 6,
    fontSize: 12,
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
  error: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
