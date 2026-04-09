import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import i18n from "../../utils/i18n";

export default function PaymentScreen({ route, navigation }) {
  const { plan, price, originalPrice } = route.params || {};
  
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    const cleanedCardNumber = cardNumber.replace(/\s/g, "");
    
    if (cleanedCardNumber.length < 16) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_card"));
      return false;
    }
    if (expiryDate.length < 5) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_expiry"));
      return false;
    }
    if (cvv.length < 3) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_cvv"));
      return false;
    }
    if (cardHolder.trim().length < 3) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_holder"));
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateCard()) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(i18n.t("error"), i18n.t("session_expired"));
        return;
      }

      // TODO: Appeler API Tranzila ici

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await addDoc(collection(db, "subscriptions"), {
        userId: user.uid,
        plan: plan,
        price: price,
        status: "active",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        autoRenew: true,
        paymentMethod: "card",
        lastFourDigits: cardNumber.replace(/\s/g, "").slice(-4),
      });

      await updateDoc(doc(db, "profiles", user.uid), {
        abonnement: plan,
        subscriptionExpiresAt: expiresAt,
      });

      await addDoc(collection(db, "invoices"), {
        userId: user.uid,
        type: "subscription",
        plan: plan,
        amount: price,
        status: "paid",
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      });

      Alert.alert(
        i18n.t("payment_success"),
        i18n.t("subscription_active", { plan: plan.toUpperCase() }),
        [
          {
            text: i18n.t("ok"),
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            }),
          },
        ]
      );
    } catch (error) {
      console.error("Erreur paiement:", error);
      Alert.alert(i18n.t("error"), i18n.t("payment_failed"));
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = () => {
    return plan === "pro_plus" ? "#1976D2" : "#4CAF50";
  };

  const getPlanName = () => {
    return plan === "pro_plus" ? "PRO+" : "PRO";
  };

  return (
    <LinearGradient colors={["#F5F5F7", "#E8E8E8"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#003366" />
          </TouchableOpacity>

          <Text style={styles.title}>{i18n.t("secure_payment")}</Text>

          <View style={styles.orderSummary}>
            <View style={styles.orderHeader}>
              <MaterialCommunityIcons name="crown" size={24} color={getPlanColor()} />
              <Text style={[styles.orderPlan, { color: getPlanColor() }]}>
                {i18n.t("subscription")} {getPlanName()}
              </Text>
            </View>
            <View style={styles.orderPriceRow}>
              {originalPrice && originalPrice !== price && (
                <Text style={styles.orderPriceOld}>{originalPrice}₪</Text>
              )}
              <Text style={styles.orderPrice}>{price}₪</Text>
              <Text style={styles.orderPriceUnit}>/{i18n.t("month")}</Text>
            </View>
            <View style={styles.orderFeatures}>
              <View style={styles.orderFeature}>
                <MaterialCommunityIcons name="check" size={16} color={getPlanColor()} />
                <Text style={styles.orderFeatureText}>{i18n.t("auto_renewal")}</Text>
              </View>
              <View style={styles.orderFeature}>
                <MaterialCommunityIcons name="check" size={16} color={getPlanColor()} />
                <Text style={styles.orderFeatureText}>{i18n.t("cancel_anytime")}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardForm}>
            <Text style={styles.formTitle}>{i18n.t("payment_info")}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("card_number")}</Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons name="credit-card" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#9CA3AF"
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{i18n.t("expiry")}</Text>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="MM/YY"
                  placeholderTextColor="#9CA3AF"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="123"
                    placeholderTextColor="#9CA3AF"
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                  <MaterialCommunityIcons name="help-circle-outline" size={18} color="#9CA3AF" />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("card_holder")}</Text>
              <TextInput
                style={styles.inputFull}
                placeholder={i18n.t("full_name_caps")}
                placeholderTextColor="#9CA3AF"
                value={cardHolder}
                onChangeText={(text) => setCardHolder(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.securityBadge}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>{i18n.t("payment_secure")}</Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePayment}
            disabled={loading}
          >
            <LinearGradient
              colors={plan === "pro_plus" ? ["#1976D2", "#42A5F5"] : ["#4CAF50", "#66BB6A"]}
              style={styles.payButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="lock" size={20} color="#FFF" />
                  <Text style={styles.payButtonText}>{i18n.t("pay")} {price}₪</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    paddingBottom: 120,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 24,
  },
  orderSummary: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  orderPlan: {
    fontSize: 20,
    fontWeight: "bold",
  },
  orderPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  orderPriceOld: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  orderPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#003366",
  },
  orderPriceUnit: {
    fontSize: 16,
    color: "#6B7280",
    marginLeft: 4,
  },
  orderFeatures: {
    gap: 8,
  },
  orderFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderFeatureText: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardForm: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#003366",
  },
  inputSmall: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: "#003366",
  },
  inputFull: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: "#003366",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: "#4CAF50",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  payButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  payButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
});