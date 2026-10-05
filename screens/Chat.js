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
  ImageBackground,
  Image,
  Modal,
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
import i18n from "../utils/i18n";

export default function Chat({ route, navigation }) {
  if (!route.params || !route.params.conversationId || !route.params.otherUserId) {
    return (
      <ScreenLayout title={i18n.t("error")} navigation={navigation} active="chat">
        <Text style={styles.error}>{i18n.t("missing_params_chat")}</Text>
      </ScreenLayout>
    );
  }

  const { conversationId, otherUserId, dogName } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [snapshotError, setSnapshotError] = useState(null);
  const currentUser = auth.currentUser;
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadOtherUserProfile = async () => {
      if (!otherUserId) return;

      try {
        const profilesRef = collection(db, "profiles");
        const profileQuery = query(profilesRef, where("uid", "==", otherUserId));
        const profileSnap = await getDocs(profileQuery);
        
        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          setOtherUserProfile({
            id: profileSnap.docs[0].id,
            ...profileData,
          });
        }
      } catch (error) {
        console.log("Erreur chargement profil autre utilisateur:", error);
      }
    };

    loadOtherUserProfile();
  }, [otherUserId]);

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
  }, []);

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMessages(msgs);
        checkIfBlocked(msgs);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.log("❌ Erreur onSnapshot messages:", error);
        setSnapshotError(i18n.t("error_loading"));
      }
    );

    const conversationRef = doc(db, "conversations", conversationId);
    updateDoc(conversationRef, {
      [`unreadCount.${currentUser.uid}`]: 0,
    }).catch((error) => {
      console.log("Erreur reset unreadCount:", error);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const checkIfBlocked = (msgs) => {
    if (msgs.length === 0) {
      setIsBlocked(false);
      return;
    }

    let consecutiveCount = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].senderId === currentUser.uid) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    setIsBlocked(consecutiveCount >= 3);
  };

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

  const handleSend = async () => {
    if (message.trim() === "" || !currentUser) return;

    if (isBlocked) {
      Alert.alert(
        i18n.t("waiting_for_reply"),
        i18n.t("sent_3_messages_wait"),
        [{ text: i18n.t("ok") }]
      );
      return;
    }

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

    } catch (error) {
      console.log("Erreur envoi message:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_sending_message"));
    }
  };

  const handleDelete = async (messageId) => {
    Alert.alert(i18n.t("delete_message"), i18n.t("confirm_delete_message"), [
      { text: i18n.t("cancel"), style: "cancel" },
      {
        text: i18n.t("delete"),
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

  const handleViewProfile = () => {
    if (otherUserProfile) {
      navigation.navigate("ViewProfile", { 
        profileId: otherUserProfile.id,
        userId: otherUserId 
      });
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    const locale = i18n.locale === "he" ? "he-IL" : i18n.locale === "ru" ? "ru-RU" : i18n.locale === "en" ? "en-US" : "fr-FR";
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        activeOpacity={0.7}
      >
        <Text style={[styles.messageText, fromMe ? styles.messageTextMe : styles.messageTextThem]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, fromMe ? styles.timeTextMe : styles.timeTextThem]}>
          {formatTime(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredMessages = getFilteredMessages();

  return (
    <ScreenLayout
      title={dogName || i18n.t("discussion")}
      navigation={navigation}
      active="chat"
      showBack
    >
      {snapshotError ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.errorBannerText}>{snapshotError}</Text>
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 25}
      >
        <TouchableOpacity
          style={styles.userHeader}
          onPress={handleViewProfile}
          activeOpacity={0.7}
        >
          {otherUserProfile?.photoUrl ? (
            <Image 
              source={{ uri: otherUserProfile.photoUrl }} 
              style={styles.userAvatar} 
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color="#FFF" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {otherUserProfile?.name || otherUserProfile?.displayName || i18n.t("user")}
            </Text>
            <Text style={styles.userSubtitle}>{i18n.t("tap_to_view_profile")}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {abonnement === "gratuit" && (
          <View style={styles.limitBanner}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color="#92400E" />
            <Text style={styles.historyText}>{i18n.t("history_60_days")}</Text>
          </View>
        )}

        {isBlocked && (
          <View style={styles.blockedBanner}>
            <MaterialCommunityIcons name="hand-back-left" size={16} color="#DC2626" />
            <Text style={styles.blockedText}>{i18n.t("waiting_reply_3_max")}</Text>
          </View>
        )}

        <ImageBackground
          source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN89+7df0FBQQYGBgY+RgYAJ+gE/dNKYfkAAAAASUVORK5CYII=' }}
          style={styles.chatBackground}
        >
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
        </ImageBackground>

        <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder={isBlocked ? i18n.t("waiting_for_reply") + "..." : i18n.t("message")}
                placeholderTextColor="#8E8E93"
                multiline
                maxLength={500}
                editable={!isBlocked}
              />
            </View>

            <TouchableOpacity
              style={styles.sendButtonContainer}
              onPress={handleSend}
              disabled={message.trim() === "" || isBlocked}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={message.trim() === "" || isBlocked ? ["#D1D5DB", "#9CA3AF"] : ["#06D6A0", "#059669"]}
                style={styles.sendButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5DDD5",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1D",
  },
  userSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  limitBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  historyText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  blockedBanner: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  blockedText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  chatBackground: {
    flex: 1,
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 2,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fromMe: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 2,
  },
  fromThem: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#000",
  },
  messageTextThem: {
    color: "#000",
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextMe: {
    color: "#5A7A62",
  },
  timeTextThem: {
    color: "#8E8E93",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#F0F0F0",
    alignItems: "flex-end",
    gap: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  input: {
    color: "#000",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53E3E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});