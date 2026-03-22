import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import ScreenLayout from "../../../components/ScreenLayout";
import { db } from "../../../config/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function InvoiceDetails({ route, navigation }) {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const docRef = doc(db, "invoices", invoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setInvoice({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Erreur loadInvoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!invoice) return;

    setDownloading(true);

    try {
      const isLeadInvoice = invoice.type === "lead_invoice";
      const isCommissionInvoice = invoice.type === "commission_invoice";
      const isCustomerInvoice = invoice.type === "customer_invoice";

      // TEMPLATE HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #003366; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1976D2; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #1976D2; margin-bottom: 10px; }
            .invoice-number { font-size: 20px; font-weight: bold; margin: 10px 0; }
            .status { display: inline-block; padding: 6px 16px; border-radius: 16px; color: white; font-weight: bold; background-color: ${invoice.status === "paid" ? "#43A047" : "#FF9900"}; }
            .section { margin: 30px 0; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1976D2; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
            .info-label { color: #6B7280; font-size: 14px; }
            .info-value { font-weight: 600; font-size: 14px; }
            .item-card { background: #F9FAFB; padding: 12px; margin: 8px 0; border-radius: 8px; display: flex; justify-content: space-between; }
            .total-card { background: #E3F2FD; padding: 20px; border-radius: 12px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total-label { font-size: 16px; font-weight: bold; }
            .total-value { font-size: 20px; font-weight: bold; }
            .divider { height: 2px; background: #1976D2; margin: 15px 0; }
            .footer { margin-top: 50px; text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🐾 CupiDog</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <span class="status">${invoice.status === "paid" ? "Payée" : "Impayée"}</span>
          </div>

          <div class="section">
            <div class="section-title">📋 Informations</div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${invoice.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"}</span>
            </div>
            ${invoice.period ? `<div class="info-row"><span class="info-label">Période:</span><span class="info-value">${invoice.period}</span></div>` : ""}
            ${invoice.dueDate ? `<div class="info-row"><span class="info-label">Date d'échéance:</span><span class="info-value">${invoice.dueDate?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"}</span></div>` : ""}
          </div>

          ${isCommissionInvoice ? `
            <div class="section">
              <div class="section-title">💰 Résumé du mois</div>
              <div class="info-row">
                <span class="info-label">Nombre de ventes:</span>
                <span class="info-value">${invoice.totalOrders}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total des ventes:</span>
                <span class="info-value">₪${invoice.totalSales?.toFixed(0)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Commission CupiDog (20%):</span>
                <span class="info-value" style="color: #DC2626;">-₪${invoice.totalCommission?.toFixed(0)}</span>
              </div>
              <div class="divider"></div>
              <div class="info-row">
                <span class="info-label" style="font-weight: bold; font-size: 16px;">Vous recevez (80%):</span>
                <span class="info-value" style="color: #43A047; font-size: 18px;">₪${invoice.totalPayout?.toFixed(0)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📦 Détail des ventes</div>
              ${invoice.sales?.map(sale => `
                <div class="item-card">
                  <span>${sale.productName} x${sale.quantity}</span>
                  <span style="font-weight: bold;">₪${sale.total?.toFixed(0)}</span>
                </div>
              `).join("") || ""}
            </div>
          ` : ""}

          ${isLeadInvoice ? `
            <div class="section">
              <div class="section-title">📞 Détail des leads</div>
              <div class="info-row">
                <span class="info-label">Nombre de leads:</span>
                <span class="info-value">${invoice.totalLeads}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">👥 Liste des leads</div>
              ${invoice.leads?.map(lead => `
                <div class="item-card">
                  <span>${lead.customerName}</span>
                  <span>${lead.date?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"}</span>
                  <span style="font-weight: bold;">₪${lead.amount}</span>
                </div>
              `).join("") || ""}
            </div>

            <div class="total-card">
              <div class="total-row">
                <span>Sous-total:</span>
                <span>₪${invoice.totalAmount?.toFixed(0)}</span>
              </div>
              <div class="total-row">
                <span>TVA (17%):</span>
                <span>₪${invoice.tva?.toFixed(0)}</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                <span class="total-label">Total TTC:</span>
                <span class="total-value">₪${invoice.totalWithTva?.toFixed(0)}</span>
              </div>
            </div>
          ` : ""}

          ${isCustomerInvoice ? `
            <div class="section">
              <div class="section-title">👤 Informations client</div>
              <div class="info-row">
                <span class="info-label">Nom:</span>
                <span class="info-value">${invoice.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Téléphone:</span>
                <span class="info-value">${invoice.customerPhone}</span>
              </div>
              ${invoice.customerEmail ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${invoice.customerEmail}</span></div>` : ""}
            </div>

            <div class="section">
              <div class="section-title">📍 Adresse de livraison</div>
              <p>${invoice.shippingAddress?.street}<br>${invoice.shippingAddress?.city} ${invoice.shippingAddress?.postalCode}</p>
            </div>

            <div class="section">
              <div class="section-title">📦 Articles commandés</div>
              ${invoice.items?.map(item => `
                <div class="item-card">
                  <span>${item.productName} x${item.quantity}</span>
                  <span style="font-weight: bold;">₪${item.total?.toFixed(0)}</span>
                </div>
              `).join("") || ""}
            </div>

            <div class="total-card">
              <div class="total-row">
                <span>Sous-total:</span>
                <span>₪${invoice.subtotal?.toFixed(0)}</span>
              </div>
              <div class="total-row">
                <span>Livraison:</span>
                <span style="color: #43A047; font-weight: bold;">GRATUITE</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                <span class="total-label">Total:</span>
                <span class="total-value">₪${invoice.total?.toFixed(0)}</span>
              </div>
            </div>
          ` : ""}

          <div class="footer">
            <p>🐾 CupiDog - Marketplace pour chiens</p>
            <p>Facture générée le ${new Date().toLocaleDateString("fr-FR")}</p>
          </div>
        </body>
        </html>
      `;

      // GÉNÉRER PDF
      const { uri } = await Print.printToFileAsync({ html });

      // PARTAGER OU TÉLÉCHARGER
      if (Platform.OS === "ios" || Platform.OS === "android") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
          });
        } else {
          Alert.alert("Succès", `PDF généré : ${uri}`);
        }
      } else {
        Alert.alert("Succès", `PDF généré : ${uri}`);
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      Alert.alert("Erreur", "Impossible de générer le PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Détail facture" navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  if (!invoice) {
    return (
      <ScreenLayout title="Détail facture" navigation={navigation} showBack>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Facture introuvable</Text>
        </View>
      </ScreenLayout>
    );
  }

  const isLeadInvoice = invoice.type === "lead_invoice";
  const isCommissionInvoice = invoice.type === "commission_invoice";
  const isCustomerInvoice = invoice.type === "customer_invoice";

  return (
    <ScreenLayout title="Détail facture" navigation={navigation} showBack>
      <View style={{ flex: 1 }}>
        {/* BOUTON TÉLÉCHARGER PDF */}
        <View style={styles.pdfSection}>
          <TouchableOpacity
            style={styles.pdfButtonContainer}
            onPress={generatePDF}
            disabled={downloading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#DC2626", "#EF4444"]}
              style={styles.pdfButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-pdf-box" size={22} color="#FFF" />
                  <Text style={styles.pdfButtonText}>Télécharger PDF</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="file-document" size={60} color="#1976D2" />
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: invoice.status === "paid" ? "#43A047" : "#FF9900" }
            ]}>
              <Text style={styles.statusText}>
                {invoice.status === "paid" ? "Payée" : "Impayée"}
              </Text>
            </View>
          </View>

          {/* INFO GÉNÉRALE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <View style={styles.card}>
              <InfoRow label="Date" value={invoice.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"} />
              {invoice.period && <InfoRow label="Période" value={invoice.period} />}
              {invoice.dueDate && (
                <InfoRow 
                  label="Date d'échéance" 
                  value={invoice.dueDate?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"} 
                />
              )}
            </View>
          </View>

          {/* FACTURE LEADS (Prestataire) */}
          {isLeadInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Détail des leads</Text>
                <View style={styles.card}>
                  <InfoRow label="Nombre de leads" value={invoice.totalLeads} bold />
                  <InfoRow label="Prix par lead" value={`Variable`} />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Liste des leads</Text>
                {invoice.leads && invoice.leads.map((lead, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{lead.customerName}</Text>
                    <Text style={styles.itemDate}>
                      {lead.date?.toDate?.()?.toLocaleDateString("fr-FR") || "N/A"}
                    </Text>
                    <Text style={styles.itemPrice}>₪{lead.amount}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Total à payer</Text>
                <View style={styles.totalCard}>
                  <InfoRow label="Sous-total" value={`₪${invoice.totalAmount?.toFixed(0)}`} />
                  <InfoRow label="TVA (17%)" value={`₪${invoice.tva?.toFixed(0)}`} />
                  <View style={styles.divider} />
                  <InfoRow label="Total TTC" value={`₪${invoice.totalWithTva?.toFixed(0)}`} bold large />
                </View>
              </View>
            </>
          )}

          {/* FACTURE COMMISSIONS (Vendeur) */}
          {isCommissionInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Résumé du mois</Text>
                <View style={styles.card}>
                  <InfoRow label="Nombre de ventes" value={invoice.totalOrders} bold />
                  <InfoRow label="Total des ventes" value={`₪${invoice.totalSales?.toFixed(0)}`} />
                  <InfoRow label="Commission CupiDog (20%)" value={`₪${invoice.totalCommission?.toFixed(0)}`} />
                  <View style={styles.divider} />
                  <InfoRow label="Vous recevez (80%)" value={`₪${invoice.totalPayout?.toFixed(0)}`} bold large green />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Détail des ventes</Text>
                {invoice.sales && invoice.sales.map((sale, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{sale.productName}</Text>
                    <Text style={styles.itemQuantity}>x{sale.quantity}</Text>
                    <View style={styles.itemPrices}>
                      <Text style={styles.itemTotal}>₪{sale.total?.toFixed(0)}</Text>
                      <Text style={styles.itemPayout}>Vous: ₪{sale.payout?.toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* FACTURE CLIENT */}
          {isCustomerInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informations client</Text>
                <View style={styles.card}>
                  <InfoRow label="Nom" value={invoice.customerName} />
                  <InfoRow label="Téléphone" value={invoice.customerPhone} />
                  {invoice.customerEmail && <InfoRow label="Email" value={invoice.customerEmail} />}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Adresse de livraison</Text>
                <View style={styles.card}>
                  <Text style={styles.addressText}>
                    {invoice.shippingAddress?.street}{"\n"}
                    {invoice.shippingAddress?.city} {invoice.shippingAddress?.postalCode}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Articles commandés</Text>
                {invoice.items && invoice.items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>₪{item.total?.toFixed(0)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Total</Text>
                <View style={styles.totalCard}>
                  <InfoRow label="Sous-total" value={`₪${invoice.subtotal?.toFixed(0)}`} />
                  <InfoRow label="Livraison" value="GRATUITE" free />
                  <View style={styles.divider} />
                  <InfoRow label="Total" value={`₪${invoice.total?.toFixed(0)}`} bold large />
                </View>
              </View>
            </>
          )}

          {/* VENDEURS (pour facture client) */}
          {isCustomerInvoice && invoice.sellers && invoice.sellers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vendeurs</Text>
              {invoice.sellers.map((seller, index) => (
                <View key={index} style={styles.card}>
                  <InfoRow label="Entreprise" value={seller.companyName} />
                  {seller.osekNumber && <InfoRow label="Osek N°" value={seller.osekNumber} />}
                  {seller.hpNumber && <InfoRow label="H.P. N°" value={seller.hpNumber} />}
                  <InfoRow label="Email" value={seller.email} />
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function InfoRow({ label, value, bold, large, green, free }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, bold && styles.infoBold]}>{label}</Text>
      <Text style={[
        styles.infoValue,
        bold && styles.infoBold,
        large && styles.infoLarge,
        green && styles.infoGreen,
        free && styles.infoFree,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  pdfSection: {
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pdfButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  pdfButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 12,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#003366",
    fontWeight: "500",
  },
  infoBold: {
    fontWeight: "bold",
    color: "#003366",
  },
  infoLarge: {
    fontSize: 18,
  },
  infoGreen: {
    color: "#43A047",
  },
  infoFree: {
    color: "#43A047",
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  itemCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: "#003366",
    fontWeight: "500",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6B7280",
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#003366",
  },
  itemDate: {
    fontSize: 12,
    color: "#6B7280",
    marginHorizontal: 8,
  },
  itemPrices: {
    alignItems: "flex-end",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#003366",
  },
  itemPayout: {
    fontSize: 12,
    color: "#43A047",
    fontWeight: "600",
  },
  totalCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
  },
  addressText: {
    fontSize: 14,
    color: "#003366",
    lineHeight: 20,
  },
});