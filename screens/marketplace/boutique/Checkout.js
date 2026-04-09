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
import i18n from "../../../utils/i18n";

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
    if (!formData.customerName.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("full_name_required"));
      return;
    }
    if (!formData.customerPhone.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("phone_required"));
      return;
    }
    if (!formData.street.trim() || !formData.city.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("full_address_required"));
      return;
    }

    Alert.alert(
      i18n.t("confirm_order"),
      `${i18n.t("total")}: ₪${getTotal().toFixed(0)}\n\n${i18n.t("delivery")} ${i18n.t("free")}\n\n${i18n.t("confirm_order_question")}`,
      [
        { text: i18n.t("cancel"), style: "cancel" },
        { text: i18n.t("order"), onPress: placeOrder }
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

      const result = await createOrder(orderData);

      if (result.success) {
        const invoiceResult = await generateCustomerInvoice(orderData);
        
        if (invoiceResult.success) {
          console.log("✅ Facture client générée:", invoiceResult.invoiceId);
          
          clearCart();
          
          Alert.alert(
            i18n.t("order_confirmed") + " ✅",
            i18n.t("order_registered_message"),
            [
              {
                text: i18n.t("download_invoice"),
                onPress: () => {
                  navigation.navigate("InvoiceDetails", { invoiceId: invoiceResult.invoiceId });
                }
              },
              {
                text: i18n.t("back_to_shop"),
                onPress: () => navigation.navigate("BoutiqueHome")
              }
            ]
          );
        } else {
          console.error("❌ Erreur génération facture:", invoiceResult.error);
          clearCart();
          Alert.alert(
            i18n.t("order_confirmed") + " !",
            i18n.t("order_registered_sms"),
            [
              {
                text: i18n.t("ok"),
                onPress: () => navigation.navigate("BoutiqueHome")
              }
            ]
          );
        }
      } else {
        Alert.alert(i18n.t("error"), i18n.t("error_placing_order"));
      }
    } catch (error) {
      console.error("Erreur placeOrder:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <ScreenLayout title={i18n.t("order")} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-off" size={80} color="#9CA3AF" />
          <Text style={styles.emptyText}>{i18n.t("cart_empty")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("finalize_order")} navigation={navigation} showBack showCart>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("order_summary")}</Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{cartItems.length} {cartItems.length > 1 ? i18n.t("items") : i18n.t("item")}</Text>
                <Text style={styles.summaryValue}>₪{getTotal().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{i18n.t("delivery")}</Text>
                <Text style={styles.summaryFree}>{i18n.t("free")}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>{i18n.t("total")}</Text>
                <Text style={styles.summaryTotalValue}>₪{getTotal().toFixed(0)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("your_details")}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("full_name")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("full_name_example")}
                value={formData.customerName}
                onChangeText={(text) => setFormData({ ...formData, customerName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("phone")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("phone_example")}
                keyboardType="phone-pad"
                value={formData.customerPhone}
                onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("email")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("email_example")}
                keyboardType="email-address"
                value={formData.customerEmail}
                onChangeText={(text) => setFormData({ ...formData, customerEmail: text })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("delivery_address")}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("street")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("street_example")}
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("city")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("city_example")}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("postal_code")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("postal_code_example")}
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("delivery_instructions")}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder={i18n.t("delivery_instructions_example")}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
            </View>
          </View>
      
        </ScrollView>

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
                <Text style={styles.submitButtonText}>{i18n.t("order_in_progress")}</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={22} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {i18n.t("order")} · ₪{getTotal().toFixed(0)}
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