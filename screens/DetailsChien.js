import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import PremiumBadge from "../components/PremiumBadge";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";

const { width } = Dimensions.get("window");

export default function DetailsChien({ route, navigation }) {
  const { dog } = route.params;
  const user = auth.currentUser;
  const [isFavorite, setIsFavorite] = useState(false);
  const [likeId, setLikeId] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [ownerAbonnement, setOwnerAbonnement] = useState("gratuit");
  const [userAbonnement, setUserAbonnement] = useState("gratuit");
  const [userProfileId, setUserProfileId] = useState(null);
  const [totalConversationsCreated, setTotalConversationsCreated] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const flatListRef = useRef(null);

  const photos = dog.photoUrls && dog.photoUrls.length > 0 
    ? dog.photoUrls 
    : dog.photoUrl 
    ? [dog.photoUrl] 
    : [];

  const getTranslatedGender = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "male" || normalized === "mâle" || normalized === "זכר" || normalized === "male_dog") return i18n.t("male_dog");
    if (normalized === "female" || normalized === "femelle" || normalized === "נקבה" || normalized === "female_dog") return i18n.t("female_dog");
    return value || i18n.t("unknown");
  };

  const getTranslatedPurpose = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "meetup" || normalized === "rencontre" || normalized === "מפגש" || normalized === "meeting") return i18n.t("meetup");
    if (normalized === "sale" || normalized === "vente" || normalized === "מכירה") return i18n.t("sale");
    if (normalized === "stud" || normalized === "saillie" || normalized === "הרבעה") return i18n.t("stud");
    return value || i18n.t("unknown");
  };

  const getTranslatedPedigree = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "oui" || normalized === "yes" || normalized === "true" || normalized === "כן") return i18n.t("yes");
    if (normalized === "non" || normalized === "no" || normalized === "false" || normalized === "לא") return i18n.t("no");
    return value || i18n.t("unknown");
  };

  const getTranslatedContest = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "oui" || normalized === "yes" || normalized === "true" || normalized === "כן") return i18n.t("yes");
    if (normalized === "non" || normalized === "no" || normalized === "false" || normalized === "לא") return i18n.t("no");
    return value || i18n.t("unknown");
  };

  const getTranslatedBreed = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const breedMap = {
      "autre": "other",
      "other": "other",
      "mixed breed": "mixed_breed",
      "métis": "mixed_breed",
      "croisé": "mixed_breed",
      "croise": "mixed_breed",
      "מעורב": "mixed_breed",
      "akita inu": "akita_inu",
      "beagle": "beagle",
      "berger allemand": "berger_allemand",
      "berger australien": "berger_australien",
      "bichon frise": "bichon_frise",
      "border collie": "border_collie",
      "bulldog anglais": "bulldog_anglais",
      "bouledogue francais": "bulldog_anglais",
      "caniche": "caniche",
      "chihuahua": "chihuahua",
      "cocker spaniel": "cocker_spaniel",
      "dalmatien": "dalmatien",
      "doberman": "doberman",
      "golden retriever": "golden_retriever",
      "grand danois": "grand_danois",
      "husky sibérien": "husky_siberien",
      "husky siberien": "husky_siberien",
      "labrador retriever": "labrador_retriever",
      "mastiff": "mastiff",
      "rottweiler": "rottweiler",
      "saint bernard": "saint_bernard",
      "samoyede": "samoyede",
      "shiba inu": "shiba_inu",
      "shih tzu": "shih_tzu",
      "vizsla": "vizsla",
      "weimaraner": "weimaraner",
      "yorkshire terrier": "yorkshire_terrier",
    };

    const key = breedMap[normalized];
    if (key) {
      const translated = i18n.t(key);
      return translated !== key ? translated : value || i18n.t("unknown");
    }

    return value || i18n.t("unknown");
  };

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      
      try {
        const likesQuery = query(
          collection(db, "likes"),
          where("fromUserId", "==", user.uid),
          where("toDogId", "==", dog.id)
        );
        const likesSnap = await getDocs(likesQuery);
        
        if (!likesSnap.empty) {
          setIsFavorite(true);
          setLikeId(likesSnap.docs[0].id);
        } else {
          setIsFavorite(false);
          setLikeId(null);
        }
      } catch (error) {
        console.log("Erreur vérification favoris:", error);
      }
    };

    const loadOwnerAbonnement = async () => {
      if (!dog.ownerId) return;

      try {
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("uid", "==", dog.ownerId));
        const profileSnap = await getDocs(q);
        
        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          setOwnerAbonnement(profileData.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement abonnement proprio:", error);
      }
    };

    const loadUserData = async () => {
      if (!user) return;

      try {
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("uid", "==", user.uid));
        const profileSnap = await getDocs(q);
        
        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          setUserAbonnement(profileData.abonnement || "gratuit");
          setUserProfileId(profileSnap.docs[0].id);
          setTotalConversationsCreated(profileData.totalConversationsCreated || 0);
        }
      } catch (error) {
        console.log("Erreur chargement profil user:", error);
      }
    };

    checkFavorite();
    loadOwnerAbonnement();
    loadUserData();
  }, [dog.id, dog.ownerId]);

  const getConversationLimit = () => {
    if (userAbonnement === "premium" || userAbonnement === "premium+") return null;
    if (userAbonnement === "essentiel") return 20;
    return 10;
  };

  const handleFavorite = async () => {
    if (!user) return;

    try {
      if (isFavorite && likeId) {
        await deleteDoc(doc(db, "likes", likeId));
        setIsFavorite(false);
        setLikeId(null);
      } else {
        const docRef = await addDoc(collection(db, "likes"), {
          fromUserId: user.uid,
          toDogId: dog.id,
          toOwnerId: dog.ownerId,
          createdAt: new Date(),
        });
        setIsFavorite(true);
        setLikeId(docRef.id);
      }
    } catch (error) {
      console.log("Erreur favoris:", error);
    }
  };

  const handleContact = async () => {
    if (!user) {
      alert(i18n.t("user_not_connected"));
      return;
    }

    if (user.uid === dog.ownerId) {
      alert(i18n.t("your_own_dog"));
      return;
    }

    try {
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participants", "array-contains", user.uid)
      );
      const conversationsSnap = await getDocs(q);
      
      let conversationId = null;
      let existingConversationsCount = conversationsSnap.size;
      
      conversationsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(dog.ownerId)) {
          conversationId = doc.id;
        }
      });

      // Si conversation existante, on l'ouvre directement
      if (conversationId) {
        navigation.navigate("Chat", {
          conversationId: conversationId,
          otherUserId: dog.ownerId,
          dogName: dog.dogName,
        });
        return;
      }

      // Sinon, vérifier la limite avant de créer
      const limit = getConversationLimit();
      const conversationsUsed = Math.max(existingConversationsCount, totalConversationsCreated);
      
      if (limit !== null && conversationsUsed >= limit) {
        setShowPaywall(true);
        return;
      }

      // Créer la nouvelle conversation
      const newConvDoc = await addDoc(conversationsRef, {
        participants: [user.uid, dog.ownerId],
        dogId: dog.id,
        dogName: dog.dogName,
        dogPhotoUrl: photos[0] || null,
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        unreadCount: {
          [user.uid]: 0,
          [dog.ownerId]: 0,
        },
        createdAt: serverTimestamp(),
      });

      // Incrémenter le compteur total de conversations créées
      if (userProfileId) {
        await updateDoc(doc(db, "profiles", userProfileId), {
          totalConversationsCreated: increment(1),
        });
        setTotalConversationsCreated(prev => prev + 1);
      }

      navigation.navigate("Chat", {
        conversationId: newConvDoc.id,
        otherUserId: dog.ownerId,
        dogName: dog.dogName,
      });
    } catch (error) {
      console.log("Erreur création conversation:", error);
      alert(i18n.t("error_creating_conversation"));
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPhoto = ({ item }) => (
    <View style={styles.photoSlide}>
      <Image source={{ uri: item }} style={styles.image} />
    </View>
  );

  return (
    <ScreenLayout title={dog.dogName} navigation={navigation} showBack>
      <LinearGradient
        colors={['#F5D547', '#FF9966']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {photos.length > 0 ? (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={photos}
                  renderItem={renderPhoto}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                />
                
                {photos.length > 1 && (
                  <View style={styles.photoIndicator}>
                    <Text style={styles.photoIndicatorText}>
                      {currentPhotoIndex + 1} / {photos.length}
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.favoriteIconTop} 
                  onPress={handleFavorite}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isFavorite ? ["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"] : ["#FFF", "#FFF"]}
                    style={styles.favoriteIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons 
                      name="heart" 
                      size={24} 
                      color={isFavorite ? "#FFF" : "#9CA3AF"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="dog" size={60} color="#999" />
                  <Text style={styles.imageText}>{i18n.t("no_image")}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.favoriteIconTop} 
                  onPress={handleFavorite}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isFavorite ? ["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"] : ["#FFF", "#FFF"]}
                    style={styles.favoriteIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons 
                      name="heart" 
                      size={24} 
                      color={isFavorite ? "#FFF" : "#9CA3AF"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* BADGES */}
            <View style={styles.badgesContainer}>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#06D6A0" />
                <Text style={styles.badgeText}>{i18n.t("verified")}</Text>
              </View>
              <PremiumBadge abonnement={ownerAbonnement} size="small" />
            </View>

            {/* INFOS AVEC ICÔNES */}
            <View style={styles.dogInfo}>
              <Text style={styles.dogName}>{dog.dogName}</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="dog" size={18} color="#6B7280" />
                <Text style={styles.infoText}>{getTranslatedBreed(dog.breed)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cake-variant" size={18} color="#6B7280" />
                <Text style={styles.infoText}>{dog.age}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="gender-male-female" size={18} color="#6B7280" />
                <Text style={styles.infoText}>{getTranslatedGender(dog.gender)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="heart-outline" size={18} color="#FF6B35" />
                <Text style={styles.infoPurpose}>{getTranslatedPurpose(dog.purpose)}</Text>
              </View>

              {getTranslatedPurpose(dog.purpose) === i18n.t("sale") && dog.price ? (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="tag" size={18} color="#06D6A0" />
                  <Text style={styles.infoPrice}>{dog.price} ₪</Text>
                </View>
              ) : null}

              {dog.pedigree && dog.pedigree !== i18n.t("not_specified") && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="certificate" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>{i18n.t("pedigree")}: {getTranslatedPedigree(dog.pedigree)}</Text>
                </View>
              )}

              {getTranslatedContest(dog.contest) === i18n.t("yes") && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="trophy" size={18} color="#FFB84D" />
                  <Text style={styles.infoText}>{dog.result || i18n.t("contest")}</Text>
                </View>
              )}

              {dog.description && (
                <Text style={styles.description}>{dog.description}</Text>
              )}
            </View>

            {/* BOUTONS */}
            <View style={styles.dogActions}>
              <TouchableOpacity 
                style={styles.likeButtonOutline} 
                onPress={handleFavorite}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isFavorite ? ["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"] : ["#E5E7EB", "#E5E7EB"]}
                  style={styles.likeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons 
                    name="heart" 
                    size={24} 
                    color={isFavorite ? "#FFF" : "#9CA3AF"} 
                  />
                </LinearGradient>
              </TouchableOpacity>
              
              {/* BOUTON CONTACTER - UNIQUEMENT SI CE N'EST PAS MON CHIEN */}
              {user?.uid !== dog.ownerId && (
                <TouchableOpacity style={styles.chatButtonContainer} onPress={handleContact}>
                  <LinearGradient
                    colors={['#06D6A0', '#059669']}
                    style={styles.chatButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="message-text-outline" size={18} color="#FFF" />
                    <Text style={styles.chatText}>{i18n.t("contact_owner")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* MODAL PAYWALL */}
      <Modal
        visible={showPaywall}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                style={styles.modalIconGradient}
              >
                <MaterialCommunityIcons name="message-alert" size={40} color="#FFF" />
              </LinearGradient>
            </View>

            <Text style={styles.modalTitle}>{i18n.t("limit_reached")}</Text>
            <Text style={styles.modalText}>
              {i18n.t("limit_reached_tap_premium")}
            </Text>
            <Text style={styles.modalSubtext}>
              {i18n.t("premium")}
            </Text>

            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowPaywall(false);
                navigation.navigate("Abonnements");
              }}
            >
              <LinearGradient
                colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonTextPrimary}>{i18n.t("view_subscriptions")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => setShowPaywall(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>{i18n.t("later")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  carouselContainer: {
    width: "100%",
    height: 240,
    marginBottom: 12,
    position: "relative",
  },
  photoSlide: {
    width: width - 64,
    height: 240,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageText: {
    color: "#999",
    marginTop: 8,
    fontSize: 14,
  },
  photoIndicator: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoIndicatorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  favoriteIconTop: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1D",
  },
  dogInfo: {
    marginBottom: 16,
  },
  dogName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1D",
  },
  infoPurpose: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FF6B35",
  },
  infoPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#06D6A0",
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 12,
    lineHeight: 22,
  },
  dogActions: {
    flexDirection: "row",
    gap: 12,
  },
  likeButtonOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  likeButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  chatButtonContainer: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  chatButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 17,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtonPrimary: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonTextPrimary: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonSecondary: {
    paddingVertical: 12,
  },
  modalButtonTextSecondary: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
}); 