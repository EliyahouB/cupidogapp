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
import i18n from "../../../utils/i18n";

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

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const generatePDF = async () => {
    if (!invoice) return;

    setDownloading(true);

    try {
      const isLeadInvoice = invoice.type === "lead_invoice";
      const isCommissionInvoice = invoice.type === "commission_invoice";
      const isCustomerInvoice = invoice.type === "customer_invoice";

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
            <span class="status">${invoice.status === "paid" ? i18n.t("paid") : i18n.t("unpaid")}</span>
          </div>

          <div class="section">
            <div class="section-title">📋 ${i18n.t("information")}</div>
            <div class="info-row">
              <span class="info-label">${i18n.t("date")}:</span>
              <span class="info-value">${invoice.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"}</span>
            </div>
            ${invoice.period ? `<div class="info-row"><span class="info-label">${i18n.t("period")}:</span><span class="info-value">${invoice.period}</span></div>` : ""}
            ${invoice.dueDate ? `<div class="info-row"><span class="info-label">${i18n.t("due_date")}:</span><span class="info-value">${invoice.dueDate?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"}</span></div>` : ""}
          </div>

          ${isCommissionInvoice ? `
            <div class="section">
              <div class="section-title">💰 ${i18n.t("month_summary")}</div>
              <div class="info-row">
                <span class="info-label">${i18n.t("number_of_sales")}:</span>
                <span class="info-value">${invoice.totalOrders}</span>
              </div>
              <div class="info-row">
                <span class="info-label">${i18n.t("total_sales")}:</span>
                <span class="info-value">₪${invoice.totalSales?.toFixed(0)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">${i18n.t("cupidog_commission")} (20%):</span>
                <span class="info-value" style="color: #DC2626;">-₪${invoice.totalCommission?.toFixed(0)}</span>
              </div>
              <div class="divider"></div>
              <div class="info-row">
                <span class="info-label" style="font-weight: bold; font-size: 16px;">${i18n.t("you_receive")} (80%):</span>
                <span class="info-value" style="color: #43A047; font-size: 18px;">₪${invoice.totalPayout?.toFixed(0)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📦 ${i18n.t("sales_detail")}</div>
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
              <div class="section-title">📞 ${i18n.t("leads_detail")}</div>
              <div class="info-row">
                <span class="info-label">${i18n.t("number_of_leads")}:</span>
                <span class="info-value">${invoice.totalLeads}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">👥 ${i18n.t("leads_list")}</div>
              ${invoice.leads?.map(lead => `
                <div class="item-card">
                  <span>${lead.customerName}</span>
                  <span>${lead.date?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"}</span>
                  <span style="font-weight: bold;">₪${lead.amount}</span>
                </div>
              `).join("") || ""}
            </div>

            <div class="total-card">
              <div class="total-row">
                <span>${i18n.t("subtotal")}:</span>
                <span>₪${invoice.totalAmount?.toFixed(0)}</span>
              </div>
              <div class="total-row">
                <span>${i18n.t("vat")} (17%):</span>
                <span>₪${invoice.tva?.toFixed(0)}</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                <span class="total-label">${i18n.t("total_with_vat")}:</span>
                <span class="total-value">₪${invoice.totalWithTva?.toFixed(0)}</span>
              </div>
            </div>
          ` : ""}

          ${isCustomerInvoice ? `
            <div class="section">
              <div class="section-title">👤 ${i18n.t("customer_info")}</div>
              <div class="info-row">
                <span class="info-label">${i18n.t("name")}:</span>
                <span class="info-value">${invoice.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">${i18n.t("phone")}:</span>
                <span class="info-value">${invoice.customerPhone}</span>
              </div>
              ${invoice.customerEmail ? `<div class="info-row"><span class="info-label">${i18n.t("email")}:</span><span class="info-value">${invoice.customerEmail}</span></div>` : ""}
            </div>

            <div class="section">
              <div class="section-title">📍 ${i18n.t("delivery_address")}</div>
              <p>${invoice.shippingAddress?.street}<br>${invoice.shippingAddress?.city} ${invoice.shippingAddress?.postalCode}</p>
            </div>

            <div class="section">
              <div class="section-title">📦 ${i18n.t("ordered_items")}</div>
              ${invoice.items?.map(item => `
                <div class="item-card">
                  <span>${item.productName} x${item.quantity}</span>
                  <span style="font-weight: bold;">₪${item.total?.toFixed(0)}</span>
                </div>
              `).join("") || ""}
            </div>

            <div class="total-card">
              <div class="total-row">
                <span>${i18n.t("subtotal")}:</span>
                <span>₪${invoice.subtotal?.toFixed(0)}</span>
              </div>
              <div class="total-row">
                <span>${i18n.t("delivery")}:</span>
                <span style="color: #43A047; font-weight: bold;">${i18n.t("free")}</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                <span class="total-label">${i18n.t("total")}:</span>
                <span class="total-value">₪${invoice.total?.toFixed(0)}</span>
              </div>
            </div>
          ` : ""}

          <div class="footer">
            <p>🐾 CupiDog - Marketplace pour chiens</p>
            <p>${i18n.t("invoice_generated_on")} ${new Date().toLocaleDateString(getLocale())}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "ios" || Platform.OS === "android") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
          });
        } else {
          Alert.alert(i18n.t("success"), `PDF: ${uri}`);
        }
      } else {
        Alert.alert(i18n.t("success"), `PDF: ${uri}`);
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_generating_pdf"));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("invoice_details")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  if (!invoice) {
    return (
      <ScreenLayout title={i18n.t("invoice_details")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <Text style={styles.errorText}>{i18n.t("invoice_not_found")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const isLeadInvoice = invoice.type === "lead_invoice";
  const isCommissionInvoice = invoice.type === "commission_invoice";
  const isCustomerInvoice = invoice.type === "customer_invoice";

  return (
    <ScreenLayout title={i18n.t("invoice_details")} navigation={navigation} showBack>
      <View style={{ flex: 1 }}>
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
                  <Text style={styles.pdfButtonText}>{i18n.t("download_pdf")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <MaterialCommunityIcons name="file-document" size={60} color="#1976D2" />
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: invoice.status === "paid" ? "#43A047" : "#FF9900" }
            ]}>
              <Text style={styles.statusText}>
                {invoice.status === "paid" ? i18n.t("paid") : i18n.t("unpaid")}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("information")}</Text>
            <View style={styles.card}>
              <InfoRow label={i18n.t("date")} value={invoice.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"} />
              {invoice.period && <InfoRow label={i18n.t("period")} value={invoice.period} />}
              {invoice.dueDate && (
                <InfoRow 
                  label={i18n.t("due_date")} 
                  value={invoice.dueDate?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"} 
                />
              )}
            </View>
          </View>

          {isLeadInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("leads_detail")}</Text>
                <View style={styles.card}>
                  <InfoRow label={i18n.t("number_of_leads")} value={invoice.totalLeads} bold />
                  <InfoRow label={i18n.t("price_per_lead")} value={i18n.t("variable")} />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("leads_list")}</Text>
                {invoice.leads && invoice.leads.map((lead, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{lead.customerName}</Text>
                    <Text style={styles.itemDate}>
                      {lead.date?.toDate?.()?.toLocaleDateString(getLocale()) || "N/A"}
                    </Text>
                    <Text style={styles.itemPrice}>₪{lead.amount}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("amount_to_pay")}</Text>
                <View style={styles.totalCard}>
                  <InfoRow label={i18n.t("subtotal")} value={`₪${invoice.totalAmount?.toFixed(0)}`} />
                  <InfoRow label={`${i18n.t("vat")} (17%)`} value={`₪${invoice.tva?.toFixed(0)}`} />
                  <View style={styles.divider} />
                  <InfoRow label={i18n.t("total_with_vat")} value={`₪${invoice.totalWithTva?.toFixed(0)}`} bold large />
                </View>
              </View>
            </>
          )}

          {isCommissionInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("month_summary")}</Text>
                <View style={styles.card}>
                  <InfoRow label={i18n.t("number_of_sales")} value={invoice.totalOrders} bold />
                  <InfoRow label={i18n.t("total_sales")} value={`₪${invoice.totalSales?.toFixed(0)}`} />
                  <InfoRow label={`${i18n.t("cupidog_commission")} (20%)`} value={`₪${invoice.totalCommission?.toFixed(0)}`} />
                  <View style={styles.divider} />
                  <InfoRow label={`${i18n.t("you_receive")} (80%)`} value={`₪${invoice.totalPayout?.toFixed(0)}`} bold large green />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("sales_detail")}</Text>
                {invoice.sales && invoice.sales.map((sale, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{sale.productName}</Text>
                    <Text style={styles.itemQuantity}>x{sale.quantity}</Text>
                    <View style={styles.itemPrices}>
                      <Text style={styles.itemTotal}>₪{sale.total?.toFixed(0)}</Text>
                      <Text style={styles.itemPayout}>{i18n.t("you")}: ₪{sale.payout?.toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {isCustomerInvoice && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("customer_info")}</Text>
                <View style={styles.card}>
                  <InfoRow label={i18n.t("name")} value={invoice.customerName} />
                  <InfoRow label={i18n.t("phone")} value={invoice.customerPhone} />
                  {invoice.customerEmail && <InfoRow label={i18n.t("email")} value={invoice.customerEmail} />}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("delivery_address")}</Text>
                <View style={styles.card}>
                  <Text style={styles.addressText}>
                    {invoice.shippingAddress?.street}{"\n"}
                    {invoice.shippingAddress?.city} {invoice.shippingAddress?.postalCode}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("ordered_items")}</Text>
                {invoice.items && invoice.items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>₪{item.total?.toFixed(0)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("total")}</Text>
                <View style={styles.totalCard}>
                  <InfoRow label={i18n.t("subtotal")} value={`₪${invoice.subtotal?.toFixed(0)}`} />
                  <InfoRow label={i18n.t("delivery")} value={i18n.t("free")} free />
                  <View style={styles.divider} />
                  <InfoRow label={i18n.t("total")} value={`₪${invoice.total?.toFixed(0)}`} bold large />
                </View>
              </View>
            </>
          )}

          {isCustomerInvoice && invoice.sellers && invoice.sellers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t("sellers")}</Text>
              {invoice.sellers.map((seller, index) => (
                <View key={index} style={styles.card}>
                  <InfoRow label={i18n.t("company")} value={seller.companyName} />
                  {seller.osekNumber && <InfoRow label="Osek N°" value={seller.osekNumber} />}
                  {seller.hpNumber && <InfoRow label="H.P. N°" value={seller.hpNumber} />}
                  <InfoRow label={i18n.t("email")} value={seller.email} />
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