// screens/auth/SubscriptionChoice.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createReferralCode, getReferralByUserId } from "../../utils/referral";

export default function SubscriptionChoice({ navigation }) {

  useEffect(() => {
    createReferralForProvider();
  }, []);

  const createReferralForProvider = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const existing = await getReferralByUserId(user.uid);
      if (existing) {
        console.log("Code parrain existe deja:", existing.code);
        return;
      }

      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data();
        const businessName = profile.businessName || profile.name || "CUPIDOG";
        
        const result = await createReferralCode(user.uid, businessName);
        if (result.success) {
          console.log("Code parrain cree:", result.code);
        }
      }
    } catch (error) {
      console.error("Erreur creation code parrain:", error);
    }
  };

  const handleSubscribe = (plan) => {
    const prices = {
      pro: { price: 179, originalPrice: 249 },
      pro_plus: { price: 279, originalPrice: 399 },
    };
    
    navigation.navigate("PaymentScreen", {
      plan: plan,
      price: prices[plan].price,
      originalPrice: prices[plan].originalPrice,
    });
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Activez votre compte PRO</Text>
          <Text style={styles.subtitle}>
            Recevez des clients et développez votre activité
          </Text>

          <View style={styles.cardsContainer}>
            {/* PRO */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.planName}>PRO</Text>
                <View style={styles.earlyBadge}>
                  <Text style={styles.earlyBadgeText}>Early Bird</Text>
                </View>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceOld}>249₪</Text>
                <Text style={styles.price}>179₪</Text>
                <Text style={styles.priceUnit}>/mois</Text>
              </View>

              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Profil listé dans l'app</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>5 photos portfolio</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Dashboard leads</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Leads à prix standard</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={() => handleSubscribe("pro")}
              >
                <Text style={styles.subscribeButtonText}>Choisir PRO</Text>
              </TouchableOpacity>
            </View>

            {/* PRO+ */}
            <View style={[styles.card, styles.cardHighlight]}>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMANDÉ</Text>
              </View>
              
              <View style={styles.cardHeader}>
                <Text style={[styles.planName, { color: "#1976D2" }]}>PRO+</Text>
                <View style={[styles.earlyBadge, { backgroundColor: "#E3F2FD" }]}>
                  <Text style={[styles.earlyBadgeText, { color: "#1976D2" }]}>Early Bird</Text>
                </View>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceOld}>399₪</Text>
                <Text style={[styles.price, { color: "#1976D2" }]}>279₪</Text>
                <Text style={styles.priceUnit}>/mois</Text>
              </View>

              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#1976D2" />
                  <Text style={styles.featureText}>Tout PRO inclus</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#1976D2" />
                  <Text style={styles.featureText}>15 photos portfolio</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="star" size={20} color="#FFB300" />
                  <Text style={[styles.featureText, { fontWeight: "600" }]}>Badge Recommandé</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="sale" size={20} color="#4CAF50" />
                  <Text style={[styles.featureText, { fontWeight: "600" }]}>Leads -25%</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.subscribeButton, styles.subscribeButtonHighlight]}
                onPress={() => handleSubscribe("pro_plus")}
              >
                <LinearGradient
                  colors={["#42A5F5", "#1976D2"]}
                  style={styles.subscribeButtonGradient}
                >
                  <Text style={styles.subscribeButtonTextWhite}>Choisir PRO+</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>
              Je fais juste une petite balade, je souscrirai plus tard
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHighlight: {
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    backgroundColor: "#1976D2",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4CAF50",
  },
  earlyBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  earlyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  priceOld: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: "700",
    color: "#4CAF50",
  },
  priceUnit: {
    fontSize: 16,
    color: "#666",
    marginLeft: 4,
  },
  features: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
  },
  subscribeButton: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  subscribeButtonHighlight: {
    overflow: "hidden",
    padding: 0,
  },
  subscribeButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  subscribeButtonTextWhite: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: "#FFF",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});