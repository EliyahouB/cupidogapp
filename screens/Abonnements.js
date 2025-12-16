import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Abonnements({ navigation }) {
  const [currentPlan, setCurrentPlan] = useState("gratuit");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserSubscription = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("uid", "==", user.uid));
        const profileSnap = await getDocs(q);

        if (!profileSnap.empty) {
          const userData = profileSnap.docs[0].data();
          setCurrentPlan(userData.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement abonnement:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSubscription();
  }, []);

  const handleSelectPlan = (planName, price) => {
    Alert.alert(
      "Confirmer l'achat",
      `Voulez-vous souscrire à ${planName} pour ${price} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            Alert.alert("En développement", "Paiement à venir !");
          },
        },
      ]
    );
  };

  const handleBoost = (boostType, price) => {
    Alert.alert(
      "Acheter un Boost",
      `${boostType} - ${price}\n7 jours en top résultats`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Acheter",
          onPress: () => {
            Alert.alert("En développement", "Paiement à venir !");
          },
        },
      ]
    );
  };

  const isSubscribed = (plan) => {
    return currentPlan === plan;
  };

  const hasSubscription = () => {
    return ["essentiel", "premium"].includes(currentPlan);
  };

  return (
    <ScreenLayout title="Abonnements" navigation={navigation} showBack>
      <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="crown" size={48} color="#FFF" />
            <Text style={styles.headerTitle}>Choisissez votre offre</Text>
            <Text style={styles.headerSubtitle}>
              Vendez, trouvez des saillies et développez votre élevage
            </Text>
          </View>

          {/* SECTION ABONNEMENTS - STYLE TINDER */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Abonnements</Text>

            {/* GRATUIT */}
            <TouchableOpacity
              style={[styles.card, isSubscribed("gratuit") && styles.cardActive]}
              activeOpacity={0.9}
              disabled={isSubscribed("gratuit")}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="dog" size={24} color="#6B7280" />
                  <Text style={styles.cardTitle}>Gratuit</Text>
                </View>
                {isSubscribed("gratuit") && (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeActiveText}>✓ Actuel</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardPrice}>0₪</Text>
              <View style={styles.cardFeatures}>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Meetups gratuits</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Achats de chiens</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 1 vente gratuite</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* VENTE */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleSelectPlan("Vente", "99₪")}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="sale" size={24} color="#FF6B35" />
                  <Text style={styles.cardTitle}>Vente</Text>
                </View>
              </View>
              <Text style={styles.cardPrice}>99₪</Text>
              <Text style={styles.cardDuration}>30 jours</Text>
              <View style={styles.cardFeatures}>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 1 chien en vente</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Active 30 jours</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Filtres acheteurs</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => handleSelectPlan("Vente", "99₪")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FF6B35", "#FF5722"]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Publier</Text>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* SAILLIE */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleSelectPlan("Saillie", "149₪")}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="heart-multiple" size={24} color="#E91E63" />
                  <Text style={styles.cardTitle}>Saillie</Text>
                </View>
              </View>
              <Text style={styles.cardPrice}>149₪</Text>
              <Text style={styles.cardDuration}>30 jours</Text>
              <View style={styles.cardFeatures}>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 1 chien saillie</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Géolocalisation</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Notifications urgentes</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => handleSelectPlan("Saillie", "149₪")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#E91E63", "#C2185B"]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Publier</Text>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* ESSENTIEL */}
            <TouchableOpacity
              style={[styles.card, styles.cardPopular, isSubscribed("essentiel") && styles.cardActive]}
              activeOpacity={0.9}
              onPress={() =>
                !isSubscribed("essentiel") &&
                handleSelectPlan("Essentiel", "249₪/mois")
              }
              disabled={isSubscribed("essentiel")}
            >
              <View style={styles.badgePopular}>
                <Text style={styles.badgePopularText}>⭐ POPULAIRE</Text>
              </View>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="star" size={24} color="#FFB84D" />
                  <Text style={styles.cardTitle}>Essentiel</Text>
                </View>
                {isSubscribed("essentiel") && (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeActiveText}>✓ Actuel</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardPrice}>249₪</Text>
              <Text style={styles.cardDuration}>par mois</Text>
              <View style={styles.cardFeatures}>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 3 annonces / mois</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 1 boost gratuit / mois</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• = 83₪ / annonce</Text>
                </View>
              </View>
              {!isSubscribed("essentiel") && (
                <TouchableOpacity
                  style={styles.buttonContainer}
                  onPress={() => handleSelectPlan("Essentiel", "249₪/mois")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#FFB84D", "#FF9800"]}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>S'abonner</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* PREMIUM */}
            <TouchableOpacity
              style={[styles.card, styles.cardPremium, isSubscribed("premium") && styles.cardActive]}
              activeOpacity={0.9}
              onPress={() =>
                !isSubscribed("premium") &&
                handleSelectPlan("Premium", "399₪/mois")
              }
              disabled={isSubscribed("premium")}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                  <Text style={styles.cardTitle}>Premium</Text>
                </View>
                {isSubscribed("premium") && (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeActiveText}>✓ Actuel</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardPrice}>399₪</Text>
              <Text style={styles.cardDuration}>par mois</Text>
              <View style={styles.cardFeatures}>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Annonces illimitées</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• 3 boosts gratuits / mois</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureText}>• Badge vérifié 👑</Text>
                </View>
              </View>
              {!isSubscribed("premium") && (
                <TouchableOpacity
                  style={styles.buttonContainer}
                  onPress={() => handleSelectPlan("Premium", "399₪/mois")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>S'abonner</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* SECTION BOOSTS - STYLE JEWBUZZLOVE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boosts Urgents</Text>
            <Text style={styles.sectionSubtitle}>Top résultats pendant 7 jours</Text>

            {/* BOOST SAILLIE */}
            <TouchableOpacity
              style={styles.boostCard}
              activeOpacity={0.8}
              onPress={() =>
                handleBoost("Boost Saillie", hasSubscription() ? "49₪" : "99₪")
              }
            >
              <LinearGradient
                colors={["#E91E63", "#9C27B0"]}
                style={styles.boostGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.boostContent}>
                  <View style={styles.boostLeft}>
                    <MaterialCommunityIcons name="rocket-launch" size={32} color="#FFF" />
                    <View style={styles.boostText}>
                      <Text style={styles.boostTitle}>Boost Saillie</Text>
                      <Text style={styles.boostSubtitle}>Urgence • Fenêtre 48h</Text>
                    </View>
                  </View>
                  <View style={styles.boostPrices}>
                    <Text style={styles.boostPriceSmall}>Sans abo: 99₪</Text>
                    <Text style={styles.boostPriceMain}>
                      {hasSubscription() ? "49₪" : "99₪"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* BOOST VENTE */}
            <TouchableOpacity
              style={styles.boostCard}
              activeOpacity={0.8}
              onPress={() =>
                handleBoost("Boost Vente", hasSubscription() ? "39₪" : "69₪")
              }
            >
              <LinearGradient
                colors={["#FF6B35", "#FF5722"]}
                style={styles.boostGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.boostContent}>
                  <View style={styles.boostLeft}>
                    <MaterialCommunityIcons name="flash" size={32} color="#FFF" />
                    <View style={styles.boostText}>
                      <Text style={styles.boostTitle}>Boost Vente</Text>
                      <Text style={styles.boostSubtitle}>Vente rapide prioritaire</Text>
                    </View>
                  </View>
                  <View style={styles.boostPrices}>
                    <Text style={styles.boostPriceSmall}>Sans abo: 69₪</Text>
                    <Text style={styles.boostPriceMain}>
                      {hasSubscription() ? "39₪" : "69₪"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
            <Text style={styles.footerText}>
              Paiement sécurisé • Annulation à tout moment
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#FFF",
    textAlign: "center",
    opacity: 0.95,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  cardActive: {
    borderWidth: 2,
    borderColor: "#06D6A0",
  },
  cardPopular: {
    borderWidth: 2,
    borderColor: "#FFB84D",
  },
  cardPremium: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  badgePopular: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#FFB84D",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePopularText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1D",
  },
  badgeActive: {
    backgroundColor: "#06D6A0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActiveText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardPrice: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 4,
  },
  cardDuration: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  cardFeatures: {
    marginBottom: 16,
  },
  feature: {
    marginBottom: 6,
  },
  featureText: {
    fontSize: 15,
    color: "#1A1A1D",
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  button: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  boostCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  boostGradient: {
    padding: 20,
  },
  boostContent: {
    gap: 16,
  },
  boostLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  boostText: {
    flex: 1,
  },
  boostTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  boostSubtitle: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.95,
  },
  boostPrices: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  boostPriceSmall: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
    marginBottom: 6,
  },
  boostPriceMain: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
});