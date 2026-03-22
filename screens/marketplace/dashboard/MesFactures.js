import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth, db } from "../../../config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { generateMonthlyLeadsInvoice, generateMonthlyCommissionInvoice } from "../../../utils/invoicing";

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

  const handleGenerateInvoice = async (period) => {
    const user = auth.currentUser;
    if (!user) return;

    const now = new Date();
    let targetMonth, targetYear, periodLabel;

    if (period === "last") {
      targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      periodLabel = "mois dernier";
    } else {
      targetMonth = now.getMonth();
      targetYear = now.getFullYear();
      periodLabel = "mois en cours";
    }

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    // VÉRIFIER SI FACTURE EXISTE DÉJÀ
    const existingInvoice = invoices.find(inv => {
      const invMonth = inv.month;
      const invYear = inv.year;
      return invMonth === targetMonth && invYear === targetYear;
    });

    if (existingInvoice) {
      Alert.alert(
        "Facture déjà générée",
        `Une facture pour ${monthNames[targetMonth]} ${targetYear} existe déjà.\n\nVoulez-vous la régénérer ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Régénérer",
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
      "Générer la facture",
      `Générer la facture de ${monthNames[targetMonth]} ${targetYear} (${periodLabel}) ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Générer",
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
                Alert.alert("Succès", "Facture générée !");
                loadInvoices();
              } else {
                Alert.alert("Info", result.message || "Aucune activité ce mois-ci");
              }
            } catch (error) {
              console.error("Erreur génération facture:", error);
              Alert.alert("Erreur", "Impossible de générer la facture");
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
      <ScreenLayout title="Mes factures" navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Mes factures" navigation={navigation} showBack>
      <View style={{ flex: 1 }}>
        {/* BOUTONS GÉNÉRER */}
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
                  <Text style={styles.generateButtonText}>Générer facture du mois dernier</Text>
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
                  <Text style={styles.generateButtonText}>Générer facture du mois en cours</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* LISTE FACTURES */}
        <ScrollView contentContainerStyle={styles.container}>
          {invoices.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="file-document-outline" size={80} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucune facture</Text>
              <Text style={styles.emptyHint}>Cliquez sur les boutons ci-dessus pour générer votre première facture</Text>
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
                    <Text style={styles.statusText}>{invoice.status === "paid" ? "Payée" : "Impayée"}</Text>
                  </View>
                </View>
                
                <Text style={styles.period}>{invoice.period || "N/A"}</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {invoice.type === "commission_invoice" ? "Total ventes :" : "Total leads :"}
                  </Text>
                  <Text style={styles.value}>₪{invoice.totalAmount?.toFixed(0) || invoice.totalSales?.toFixed(0)}</Text>
                </View>

                {invoice.type === "commission_invoice" && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Commission CupiDog (20%) :</Text>
                      <Text style={styles.commission}>-₪{invoice.totalCommission?.toFixed(0)}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.labelBold}>Vous recevez :</Text>
                      <Text style={styles.valueBold}>₪{invoice.totalPayout?.toFixed(0)}</Text>
                    </View>
                  </>
                )}

                {invoice.type === "lead_invoice" && (
                  <View style={styles.row}>
                    <Text style={styles.labelBold}>Total TTC :</Text>
                    <Text style={styles.valueBold}>₪{invoice.totalWithTva?.toFixed(0)}</Text>
                  </View>
                )}

                <Text style={styles.date}>
                  {invoice.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "Date inconnue"}
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