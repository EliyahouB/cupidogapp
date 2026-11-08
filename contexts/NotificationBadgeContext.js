import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

const NotificationBadgeContext = createContext({
  chatUnreadCount: 0,
  likesUnreadCount: 0,
});

export function NotificationBadgeProvider({ uid, profileLoaded, children }) {
  const [counts, setCounts] = useState({
    chatUnreadCount: 0,
    likesUnreadCount: 0,
  });

  useEffect(() => {
    setCounts({ chatUnreadCount: 0, likesUnreadCount: 0 });
    if (!uid || !profileLoaded) return undefined;

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid)
    );
    const unsubscribeConversations = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const chatUnreadCount = snapshot.docs.reduce(
          (total, conversation) => total + (conversation.data().unreadCount?.[uid] || 0),
          0
        );
        setCounts((current) => ({ ...current, chatUnreadCount }));
      },
      (error) => {
        console.error("Erreur listener badge messages:", error);
      }
    );

    const likesQuery = query(
      collection(db, "likes"),
      where("toOwnerId", "==", uid)
    );
    const unsubscribeLikes = onSnapshot(
      likesQuery,
      (snapshot) => {
        const likesUnreadCount = snapshot.docs.filter(
          (like) => like.data().isRead !== true
        ).length;
        setCounts((current) => ({ ...current, likesUnreadCount }));
      },
      (error) => {
        console.error("Erreur listener badge likes:", error);
      }
    );

    return () => {
      unsubscribeConversations();
      unsubscribeLikes();
    };
  }, [uid, profileLoaded]);

  return (
    <NotificationBadgeContext.Provider value={counts}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadges() {
  return useContext(NotificationBadgeContext);
}