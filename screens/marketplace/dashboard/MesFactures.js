import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth, db } from "../../../config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { generateMonthlyLeadsInvoice, generateMonthlyCommissionInvoice } from "../../../utils/invoicing";
import i18n from "../../../utils/i18n";

export default function MesFactures({ navigation }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const proDoc = await getDoc(doc(db, "professional_accounts", user.uid));
      
      if (!proDoc.exists()) {
        setLoading(false);
        return;
      }

      const proData = proDoc.data();
      const type = proData.activityType === "seller" ? "seller" : "provider";
      setUserType(type);

      let q;
      if (type === "seller") {
        q = query(collection(db, "invoices"), where("sellerId", "==", user.uid));
      } else {
        q = query(collection(db, "invoices"), where("providerId", "==", user.uid));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(data.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    } catch (error) {
      console.error("Erreur loadInvoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthNames = () => {
    return [
      i18n.t("january"), i18n.t("february"), i18n.t("march"), i18n.t("april"),
      i18n.t("may"), i18n.t("june"), i18n.t("july"), i18n.t("august"),
      i18n.t("september"), i18n.t("october"), i18n.t("november"), i18n.t("december")
    ];
  };

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const handleGenerateInvoice = async (period) => {
    const user = auth.currentUser;
    if (!user) return;

    const now = new Date();
    let targetMonth, targetYear, periodLabel;
    const monthNames = getMonthNames();

    if (period === "last") {
      targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      periodLabel = i18n.t("last_month");
    } else {
      targetMonth = now.getMonth();
      targetYear = now.getFullYear();
      periodLabel = i18n.t("current_month");
    }

    const existingInvoice = invoices.find(inv => {
      const invMonth = inv.month;
      const invYear = inv.year;
      return invMonth === targetMonth && invYear === targetYear;
    });

    if (existingInvoice) {
      Alert.alert(
        i18n.t("invoice_already_generated"),
        `${i18n.t("invoice_for")} ${monthNames[targetMonth]} ${targetYear} ${i18n.t("already_exists")}.\n\n${i18n.t("regenerate_question")}`,
        [
          { text: i18n.t("cancel"), style: "cancel" },
          {
            text: i18n.t("regenerate"),
            style: "destructive",
            onPress: () => confirmGeneration(targetMonth, targetYear, periodLabel, monthNames)
          }
        ]
      );
    } else {
      confirmGeneration(targetMonth, targetYear, periodLabel, monthNames);
    }
  };

  const confirmGeneration = (targetMonth, targetYear, periodLabel, monthNames) => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      i18n.t("generate_invoice"),
      `${i18n.t("generate_invoice_for")} ${monthNames[targetMonth]} ${targetYear} (${periodLabel}) ?`,
      [
        { text: i18n.t("cancel"), style: "cancel" },
        {
          text: i18n.t("generate"),
          onPress: async () => {
            setGenerating(true);
            try {
              let result;
              
              if (userType === "seller") {
                result = await generateMonthlyCommissionInvoice(user.uid, targetMonth, targetYear);
              } else {
                result = await generateMonthlyLeadsInvoice(user.uid, targetMonth, targetYear);
              }

              if (result.success) {
                Alert.alert(i18n.t("success"), i18n.t("invoice_generated"));
                loadInvoices();
              } else {
                Alert.alert(i18n.t("info"), result.message || i18n.t("no_activity_this_month"));
              }
            } catch (error) {
              console.error("Erreur génération facture:", error);
              Alert.alert(i18n.t("error"), i18n.t("error_generating_invoice"));
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_invoices")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("my_invoices")} navigation={navigation} showBack>
      <View style={{ flex: 1 }}>
        <View style={styles.generateSection}>
          <TouchableOpacity
            style={styles.generateButtonContainer}
            onPress={() => handleGenerateInvoice("last")}
            disabled={generating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#1976D2", "#42A5F5"]}
              style={styles.generateButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-document-plus" size={22} color="#FFF" />
                  <Text style={styles.generateButtonText}>{i18n.t("generate_last_month_invoice")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.generateButtonContainer}
            onPress={() => handleGenerateInvoice("current")}
            disabled={generating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#43A047", "#66BB6A"]}
              style={styles.generateButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="calendar-clock" size={22} color="#FFF" />
                  <Text style={styles.generateButtonText}>{i18n.t("generate_current_month_invoice")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {invoices.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="file-document-outline" size={80} color="#9CA3AF" />
              <Text style={styles.emptyText}>{i18n.t("no_invoices")}</Text>
              <Text style={styles.emptyHint}>{i18n.t("click_buttons_to_generate")}</Text>
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
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: invoice.status === "paid" ? "#43A047" : "#FF9900" }]}>
                    <Text style={styles.statusText}>{invoice.status === "paid" ? i18n.t("paid") : i18n.t("unpaid")}</Text>
                  </View>
                </View>
                
                <Text style={styles.period}>{invoice.period || "N/A"}</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {invoice.type === "commission_invoice" ? i18n.t("total_sales") + " :" : i18n.t("total_leads") + " :"}
                  </Text>
                  <Text style={styles.value}>₪{invoice.totalAmount?.toFixed(0) || invoice.totalSales?.toFixed(0)}</Text>
                </View>

                {invoice.type === "commission_invoice" && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>{i18n.t("cupidog_commission")} (20%) :</Text>
                      <Text style={styles.commission}>-₪{invoice.totalCommission?.toFixed(0)}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.labelBold}>{i18n.t("you_receive")} :</Text>
                      <Text style={styles.valueBold}>₪{invoice.totalPayout?.toFixed(0)}</Text>
                    </View>
                  </>
                )}

                {invoice.type === "lead_invoice" && (
                  <View style={styles.row}>
                    <Text style={styles.labelBold}>{i18n.t("total_with_vat")} :</Text>
                    <Text style={styles.valueBold}>₪{invoice.totalWithTva?.toFixed(0)}</Text>
                  </View>
                )}

                <Text style={styles.date}>
                  {invoice.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || i18n.t("unknown_date")}
                </Text>

                <View style={styles.chevron}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 100 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  generateSection: {
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  generateButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
  },
  empty: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 16, color: "#6B7280", marginTop: 16 },
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  invoiceNumber: { fontSize: 16, fontWeight: "bold", color: "#003366" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#FFF" },
  period: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6B7280" },
  value: { fontSize: 14, fontWeight: "600", color: "#003366" },
  commission: { fontSize: 14, fontWeight: "600", color: "#DC2626" },
  labelBold: { fontSize: 15, fontWeight: "bold", color: "#003366" },
  valueBold: { fontSize: 16, fontWeight: "bold", color: "#43A047" },
  date: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
});