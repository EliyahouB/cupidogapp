import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { useCart } from "../../../contexts/CartContext";
import { auth } from "../../../config/firebase";
import { createOrder } from "../../../utils/marketplace";
import { generateCustomerInvoice } from "../../../utils/invoicing";

export default function Checkout({ navigation }) {
  const { cartItems, getTotal, clearCart } = useCart();
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: user?.email || "",
    street: "",
    city: "",
    postalCode: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    // VALIDATION
    if (!formData.customerName.trim()) {
      Alert.alert("Erreur", "Nom complet requis");
      return;
    }
    if (!formData.customerPhone.trim()) {
      Alert.alert("Erreur", "Téléphone requis");
      return;
    }
    if (!formData.street.trim() || !formData.city.trim()) {
      Alert.alert("Erreur", "Adresse de livraison complète requise");
      return;
    }

    // CONFIRMATION
    Alert.alert(
      "Confirmer la commande",
      `Total : ₪${getTotal().toFixed(0)}\n\nLivraison GRATUITE\n\nConfirmer votre commande ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Commander", onPress: placeOrder }
      ]
    );
  };

  const placeOrder = async () => {
    setLoading(true);

    try {
      const orderData = {
        customerId: user.uid,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
          notes: formData.notes,
        },
        items: cartItems.map(item => ({
          productId: item.id,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          commission: item.price * 0.2,
          sellerPayout: item.price * 0.8,
        })),
        subtotal: getTotal(),
        totalCommission: getTotal() * 0.2,
        total: getTotal(),
        paymentMethod: "cash_on_delivery",
      };

      // CRÉER LA COMMANDE
      const result = await createOrder(orderData);

      if (result.success) {
        // GÉNÉRER LA FACTURE CLIENT
        const invoiceResult = await generateCustomerInvoice(orderData);
        
        if (invoiceResult.success) {
          console.log("✅ Facture client générée:", invoiceResult.invoiceId);
          
          clearCart();
          
          // POPUP AVEC OPTION TÉLÉCHARGER FACTURE
          Alert.alert(
            "Commande confirmée ! ✅",
            "Votre commande a été enregistrée.\n\nVous recevrez :\n• Un SMS de confirmation\n• Une facture par email",
            [
              {
                text: "Télécharger ma facture",
                onPress: () => {
                  navigation.navigate("InvoiceDetails", { invoiceId: invoiceResult.invoiceId });
                }
              },
              {
                text: "Retour à la boutique",
                onPress: () => navigation.navigate("BoutiqueHome")
              }
            ]
          );
        } else {
          console.error("❌ Erreur génération facture:", invoiceResult.error);
          clearCart();
          Alert.alert(
            "Commande confirmée !",
            "Votre commande a été enregistrée.\n\nVous recevrez un SMS de confirmation.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("BoutiqueHome")
              }
            ]
          );
        }
      } else {
        Alert.alert("Erreur", "Impossible de passer la commande. Réessayez.");
      }
    } catch (error) {
      console.error("Erreur placeOrder:", error);
      Alert.alert("Erreur", "Une erreur s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <ScreenLayout title="Commande" navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-off" size={80} color="#9CA3AF" />
          <Text style={styles.emptyText}>Votre panier est vide</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Finaliser la commande" navigation={navigation} showBack showCart>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* RÉSUMÉ COMMANDE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{cartItems.length} article(s)</Text>
                <Text style={styles.summaryValue}>₪{getTotal().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison</Text>
                <Text style={styles.summaryFree}>GRATUITE</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>₪{getTotal().toFixed(0)}</Text>
              </View>
            </View>
          </View>

          {/* COORDONNÉES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vos coordonnées</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: David Cohen"
                value={formData.customerName}
                onChangeText={(text) => setFormData({ ...formData, customerName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 054-123-4567"
                keyboardType="phone-pad"
                value={formData.customerPhone}
                onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: david@example.com"
                keyboardType="email-address"
                value={formData.customerEmail}
                onChangeText={(text) => setFormData({ ...formData, customerEmail: text })}
              />
            </View>
          </View>

          {/* ADRESSE LIVRAISON */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rue *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 123 Rue Rothschild"
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Tel Aviv"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Code postal</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 6801296"
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instructions de livraison</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Code portail, étage, etc."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
            </View>
          </View>
      
        </ScrollView>

        {/* BOUTON COMMANDER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#43A047", "#66BB6A"]}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.submitButtonText}>Commande en cours...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={22} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    Commander · ₪{getTotal().toFixed(0)}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  summaryFree: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#43A047",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
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
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#003366",
  },
  textarea: {
    minHeight: 80,
    paddingTop: 12,
  },
  paymentBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#43A047",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});