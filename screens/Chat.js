import React, { useState, useEffect, useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { registerForPushNotificationsAsync } from "../utils/Notifications";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc,
  getDoc,
  getDocs,
  where,
  deleteDoc,
} from "firebase/firestore";

export default function Chat({ route, navigation }) {
  if (!route.params || !route.params.conversationId || !route.params.otherUserId) {
    return (
      <ScreenLayout title="Erreur" navigation={navigation} active="chat">
        <Text style={styles.error}>
          Paramètres manquants pour ouvrir la discussion.
        </Text>
      </ScreenLayout>
    );
  }

  const { conversationId, otherUserId, dogName } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [abonnement, setAbonnement] = useState("gratuit");
  const currentUser = auth.currentUser;
  const flatListRef = useRef(null);

  // CHARGEMENT ABONNEMENT (1 FOIS)
  useEffect(() => {
    const loadUserSubscription = async () => {
      if (!currentUser) return;

      try {
        const profilesRef = collection(db, "profiles");
        const profileQuery = query(profilesRef, where("uid", "==", currentUser.uid));
        const profileSnap = await getDocs(profileQuery);
        
        if (!profileSnap.empty) {
          const userData = profileSnap.docs[0].data();
          setAbonnement(userData.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement abonnement:", error);
      }
    };

    loadUserSubscription();
  }, []); // ← PAS DE DÉPENDANCE

  // CHARGEMENT MESSAGES (1 FOIS)
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(msgs);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // RESET UNREAD COUNT
    const conversationRef = doc(db, "conversations", conversationId);
    updateDoc(conversationRef, {
      [`unreadCount.${currentUser.uid}`]: 0,
    }).catch((error) => {
      console.log("Erreur reset unreadCount:", error);
    });

    return () => unsubscribe();
  }, [conversationId]); // ← SEULEMENT conversationId

  // PUSH NOTIFICATIONS
  useEffect(() => {
    const askPermission = async () => {
      if (!currentUser) return;
      
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { pushToken: token }, { merge: true });
    };

    askPermission();
  }, []);

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
      console.log("Erreur notification push:", error);
    }
  };

  const handleSend = async () => {
    if (message.trim() === "" || !currentUser) return;

    const messageText = message.trim();
    setMessage("");

    try {
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      const conversationRef = doc(db, "conversations", conversationId);
      await updateDoc(conversationRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: increment(1),
      });

      const ownerRef = doc(db, "users", otherUserId);
      const ownerSnap = await getDoc(ownerRef);

      if (ownerSnap.exists()) {
        const token = ownerSnap.data().pushToken;
        if (token) {
          await sendPushNotification(token, `Nouveau message - ${dogName}`, messageText);
        }
      }
    } catch (error) {
      console.log("Erreur envoi message:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le message");
    }
  };

  const handleDelete = async (messageId) => {
    Alert.alert("Supprimer le message", "Confirmer la suppression ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const messageRef = doc(
              db,
              "conversations",
              conversationId,
              "messages",
              messageId
            );
            await deleteDoc(messageRef);
          } catch (error) {
            console.log("Erreur suppression:", error);
          }
        },
      },
    ]);
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // FILTRAGE 60 JOURS (AU RENDU)
  const getFilteredMessages = () => {
    if (abonnement !== "gratuit") return messages;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    return messages.filter((msg) => {
      if (!msg.createdAt || !msg.createdAt.seconds) return true;
      const msgDate = new Date(msg.createdAt.seconds * 1000);
      return msgDate >= sixtyDaysAgo;
    });
  };

  const renderItem = ({ item }) => {
    const fromMe = item.senderId === currentUser.uid;

    return (
      <TouchableOpacity
        onLongPress={() => fromMe && handleDelete(item.id)}
        style={[
          styles.messageBubble,
          fromMe ? styles.fromMe : styles.fromThem,
        ]}
      >
        <Text style={[styles.messageText, !fromMe && { color: "#1A1A1D" }]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, !fromMe && { color: "#6B7280" }]}>
          {formatTime(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredMessages = getFilteredMessages();

  return (
    <ScreenLayout
      title={dogName || "Discussion"}
      navigation={navigation}
      active="chat"
      showBack
    >
      <View style={styles.container}>
        {abonnement === "gratuit" && (
          <View style={styles.limitBanner}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#FF6B35" />
            <Text style={styles.historyText}>
              Historique : 60 jours (Gratuit)
            </Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Envoyer un message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButtonContainer}
              onPress={handleSend}
              disabled={message.trim() === ""}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={message.trim() === "" ? ["#D1D5DB", "#9CA3AF"] : ["#42A5F5", "#1976D2"]}
                style={styles.sendButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  limitBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F59E0B",
  },
  historyText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: "75%",
  },
  fromMe: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  fromThem: {
    backgroundColor: "#F5F5F7",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#FFF",
    fontSize: 16,
    marginBottom: 4,
  },
  timeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    color: "#1A1A1D",
    padding: 12,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButtonContainer: {
    borderRadius: 22,
    overflow: "hidden",
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "#1A1A1D",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});