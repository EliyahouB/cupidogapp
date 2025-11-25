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
        <Text style={styles.error}>
          Parametres manquants pour ouvrir la discussion.
        </Text>
      </ScreenLayout>
    );
  }

  const { ownerId, dogName } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [conversationsCount, setConversationsCount] = useState(0);
  const [canSendMessage, setCanSendMessage] = useState(true);

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
    const checkConversationLimit = async () => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userAbonnement = userSnap.exists()
          ? userSnap.data().abonnement || "gratuit"
          : "gratuit";

        setAbonnement(userAbonnement);

        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("participants", "array-contains", currentUser.uid)
        );
        const snap = await getDocs(q);

        const uniqueConversations = new Set();
        snap.forEach((doc) => {
          const msg = doc.data();
          const otherUserId =
            msg.fromUserId === currentUser.uid
              ? msg.toUserId
              : msg.fromUserId;
          uniqueConversations.add(otherUserId);
        });

        setConversationsCount(uniqueConversations.size);

        const isExistingConversation = uniqueConversations.has(ownerId);

        if (!isExistingConversation) {
          let limit = 10;
          if (userAbonnement === "lite") limit = 20;
          if (userAbonnement === "premium") limit = null;

          if (limit !== null && uniqueConversations.size >= limit) {
            setCanSendMessage(false);
            Alert.alert(
              "Limite atteinte",
              "Vous avez atteint votre limite de conversations. Passez a Lite ou Premium pour continuer.",
              [
                {
                  text: "OK",
                  onPress: () => navigation.goBack(),
                },
              ]
            );
          }
        }
      } catch (error) {
        console.log("Erreur verification limite :", error);
      }
    };

    checkConversationLimit();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userAbonnement = userSnap.exists()
          ? userSnap.data().abonnement || "gratuit"
          : "gratuit";

        const messagesRef = collection(db, "messages");
        const messagesQuery = query(
          messagesRef,
          where("participants", "array-contains", currentUser.uid),
          orderBy("createdAt")
        );
        const snap = await getDocs(messagesQuery);

        let filtered = snap.docs
          .map((doc) => ({ ...doc.data(), docId: doc.id }))
          .filter(
            (msg) =>
              (msg.fromUserId === currentUser.uid &&
                msg.toUserId === ownerId) ||
              (msg.fromUserId === ownerId && msg.toUserId === currentUser.uid)
          );

        if (userAbonnement === "gratuit") {
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

          filtered = filtered.filter((msg) => {
            const msgDate = msg.createdAt?.toDate
              ? msg.createdAt.toDate()
              : new Date(msg.createdAt.seconds * 1000);
            return msgDate >= sixtyDaysAgo;
          });
        }

        const mappedMessages = filtered.map((msg) => ({
          id: msg.docId,
          text: msg.text,
          fromMe: msg.fromUserId === currentUser.uid,
          createdAt: msg.createdAt,
        }));

        setMessages(mappedMessages);
      } catch (error) {
        console.log("Erreur lors du chargement des messages :", error);
      }
    };

    fetchMessages();
  }, [ownerId]);

  const sendPushNotification = async (token, title, body) => {
    try {
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
    } catch (error) {
      console.log("Erreur notification push :", error);
    }
  };

  const handleSend = async () => {
    if (message.trim() === "" || !currentUser) return;

    if (!canSendMessage) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint votre limite de conversations."
      );
      return;
    }

    const newMessage = {
      text: message,
      fromUserId: currentUser.uid,
      toUserId: ownerId,
      dogName,
      createdAt: new Date(),
      participants: [currentUser.uid, ownerId],
      isRead: false,
    };

    try {
      const docRef = await addDoc(collection(db, "messages"), newMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: docRef.id,
          text: message,
          fromMe: true,
          createdAt: new Date(),
        },
      ]);
      setMessage("");

      const ownerRef = doc(db, "users", ownerId);
      const ownerSnap = await getDoc(ownerRef);

      if (ownerSnap.exists()) {
        const token = ownerSnap.data().pushToken;
        if (token) {
          await sendPushNotification(
            token,
            i18n.t("newMessageTitle"),
            message
          );
        }
      }
    } catch (error) {
      console.log("Erreur lors de l envoi du message :", error);
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

  const getLimitText = () => {
    if (abonnement === "premium") return null;
    const limit = abonnement === "lite" ? 20 : 10;
    const remaining = limit - conversationsCount;
    if (remaining <= 0) return "Limite atteinte";
    return "Encore " + remaining + " conversation(s)";
  };

  return (
    <ScreenLayout
      title={"Discussion - " + dogName}
      navigation={navigation}
      active="chat"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {abonnement !== "premium" && (
          <View style={styles.limitBanner}>
            <Text style={styles.limitText}>{getLimitText()}</Text>
            {abonnement === "gratuit" && (
              <Text style={styles.historyText}>
                Historique : 60 jours
              </Text>
            )}
          </View>
        )}

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
            editable={canSendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !canSendMessage && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSendMessage}
          >
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
  limitBanner: {
    backgroundColor: "#1a1a1a",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  limitText: {
    color: "#ff914d",
    fontSize: 12,
    fontWeight: "bold",
  },
  historyText: {
    color: "#aaa",
    fontSize: 11,
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
  sendButtonDisabled: {
    backgroundColor: "#666",
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