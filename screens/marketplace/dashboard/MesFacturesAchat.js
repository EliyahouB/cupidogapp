import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth, db } from "../../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import i18n from "../../../utils/i18n";

export default function MesFacturesAchat({ navigation }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const loadInvoices = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, "invoices"), 
        where("customerId", "==", user.uid),
        where("type", "==", "customer_invoice")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(data.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    } catch (error) {
      console.error("Erreur loadInvoices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_purchase_invoices")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("my_purchase_invoices")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        {invoices.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt-text-outline" size={80} color="#9CA3AF" />
            <Text style={styles.emptyText}>{i18n.t("no_purchase_invoices")}</Text>
            <Text style={styles.emptyHint}>{i18n.t("purchase_invoices_appear_here")}</Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <TouchableOpacity 
              key={invoice.id} 
              style={styles.card}
              onPress={() => navigation.navigate("InvoiceDetails", { invoiceId: invoice.id })}
              activeOpacity={0.7}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <MaterialCommunityIcons name="shopping" size={24} color="#1976D2" />
                  <View style={styles.headerText}>
                    <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                    <Text style={styles.date}>
                      {invoice.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || i18n.t("unknown_date")}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: invoice.status === "paid" ? "#43A047" : "#FF9900" }
                ]}>
                  <Text style={styles.statusText}>
                    {invoice.status === "paid" ? i18n.t("paid") : i18n.t("pending")}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>
                  {invoice.items?.length || 0} {(invoice.items?.length || 0) > 1 ? i18n.t("items") : i18n.t("item")}
                </Text>
                {invoice.items && invoice.items.slice(0, 2).map((item, index) => (
                  <Text key={index} style={styles.itemText} numberOfLines={1}>
                    • {item.productName} x{item.quantity}
                  </Text>
                ))}
                {invoice.items && invoice.items.length > 2 && (
                  <Text style={styles.moreItems}>
                    +{invoice.items.length - 2} {i18n.t("other")}
                  </Text>
                )}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{i18n.t("total")}</Text>
                <Text style={styles.totalValue}>₪{invoice.total?.toFixed(0)}</Text>
              </View>

              <View style={styles.chevron}>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    paddingBottom: 100 
  },
  loading: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  empty: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: { 
    fontSize: 16, 
    color: "#6B7280", 
    marginTop: 16,
    fontWeight: "600",
  },
  emptyHint: { 
    fontSize: 13, 
    color: "#9CA3AF", 
    marginTop: 8, 
    textAlign: "center",
    lineHeight: 18,
  },
  card: { 
    backgroundColor: "#FFF", 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2,
    position: "relative",
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  invoiceNumber: { 
    fontSize: 15, 
    fontWeight: "bold", 
    color: "#003366",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: "bold", 
    color: "#FFF" 
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  itemText: {
    fontSize: 13,
    color: "#003366",
    marginBottom: 3,
  },
  moreItems: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1976D2",
  },
  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
});