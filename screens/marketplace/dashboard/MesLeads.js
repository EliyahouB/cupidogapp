import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth } from "../../../config/firebase";
import { getLeadsByProvider, updateLeadStatus } from "../../../utils/marketplace";
import i18n from "../../../utils/i18n";

export default function MesLeads({ navigation }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    loadLeads();
  }, []);

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const loadLeads = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const data = await getLeadsByProvider(user.uid);
      setLeads(data);
    } catch (error) {
      console.error("Erreur loadLeads:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const result = await updateLeadStatus(leadId, newStatus);
      if (result.success) {
        loadLeads();
      }
    } catch (error) {
      console.error("Erreur handleStatusChange:", error);
    }
  };

  const getFilteredLeads = () => {
    return leads.filter(lead => lead.status === filter);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#FF9900",
      contacted: "#1976D2",
      completed: "#43A047",
      cancelled: "#DC2626",
    };
    return colors[status] || "#6B7280";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: i18n.t("pending"),
      contacted: i18n.t("contacted"),
      completed: i18n.t("completed"),
      cancelled: i18n.t("cancelled"),
    };
    return labels[status] || status;
  };

  const getStatusCounts = () => {
    return {
      pending: leads.filter(l => l.status === "pending").length,
      contacted: leads.filter(l => l.status === "contacted").length,
      completed: leads.filter(l => l.status === "completed").length,
      cancelled: leads.filter(l => l.status === "cancelled").length,
    };
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_requests")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  const filteredLeads = getFilteredLeads();
  const counts = getStatusCounts();

  return (
    <ScreenLayout title={i18n.t("my_requests")} navigation={navigation} showBack>
      <View style={styles.container}>
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filter === "pending" && styles.filterChipActive]}
              onPress={() => setFilter("pending")}
            >
              <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>
                {i18n.t("pending")} ({counts.pending})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "contacted" && styles.filterChipActive]}
              onPress={() => setFilter("contacted")}
            >
              <Text style={[styles.filterText, filter === "contacted" && styles.filterTextActive]}>
                {i18n.t("contacted")} ({counts.contacted})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "completed" && styles.filterChipActive]}
              onPress={() => setFilter("completed")}
            >
              <Text style={[styles.filterText, filter === "completed" && styles.filterTextActive]}>
                {i18n.t("completed")} ({counts.completed})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "cancelled" && styles.filterChipActive]}
              onPress={() => setFilter("cancelled")}
            >
              <Text style={[styles.filterText, filter === "cancelled" && styles.filterTextActive]}>
                {i18n.t("cancelled")} ({counts.cancelled})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredLeads.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="inbox" size={80} color="#9CA3AF" />
              <Text style={styles.emptyText}>{i18n.t("no_requests")} {getStatusLabel(filter).toLowerCase()}</Text>
            </View>
          ) : (
            <View style={styles.leadsList}>
              {filteredLeads.map((lead) => (
                <View key={lead.id} style={styles.leadCard}>
                  <View style={styles.leadHeader}>
                    <View style={styles.leadHeaderLeft}>
                      <MaterialCommunityIcons name="account" size={20} color="#003366" />
                      <Text style={styles.customerName}>{lead.customerName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                      <Text style={styles.statusBadgeText}>{getStatusLabel(lead.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.contactSection}>
                    <View style={styles.contactRow}>
                      <MaterialCommunityIcons name="phone" size={16} color="#6B7280" />
                      <Text style={styles.contactText}>{lead.customerPhone}</Text>
                    </View>
                    {lead.customerEmail && (
                      <View style={styles.contactRow}>
                        <MaterialCommunityIcons name="email" size={16} color="#6B7280" />
                        <Text style={styles.contactText}>{lead.customerEmail}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.messageSection}>
                    <Text style={styles.messageLabel}>{i18n.t("message")} :</Text>
                    <Text style={styles.messageText}>{lead.message}</Text>
                  </View>

                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="cash" size={16} color="#43A047" />
                      <Text style={styles.infoText}>{i18n.t("lead_price")} : {lead.leadPrice}₪</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {lead.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || i18n.t("unknown_date")}
                      </Text>
                    </View>
                  </View>

                  {lead.status === "pending" && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonContact]}
                        onPress={() => handleStatusChange(lead.id, "contacted")}
                      >
                        <MaterialCommunityIcons name="phone-check" size={18} color="#FFF" />
                        <Text style={styles.actionButtonText}>{i18n.t("mark_contacted")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonCancel]}
                        onPress={() => handleStatusChange(lead.id, "cancelled")}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color="#FFF" />
                        <Text style={styles.actionButtonText}>{i18n.t("refuse")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {lead.status === "contacted" && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonComplete]}
                        onPress={() => handleStatusChange(lead.id, "completed")}
                      >
                        <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" />
                        <Text style={styles.actionButtonText}>{i18n.t("mark_completed")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {leads.length > 0 && (
          <View style={styles.statsFooter}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{leads.length}</Text>
              <Text style={styles.statLabel}>{i18n.t("total")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{counts.completed}</Text>
              <Text style={styles.statLabel}>{i18n.t("completed")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {counts.completed > 0 ? Math.round((counts.completed / leads.length) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>{i18n.t("rate")}</Text>
            </View>
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filters: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#1976D2",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  leadsList: {
    gap: 16,
  },
  leadCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  leadHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
  },
  contactSection: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#003366",
  },
  messageSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#003366",
    lineHeight: 20,
  },
  infoSection: {
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonContact: {
    backgroundColor: "#1976D2",
  },
  actionButtonComplete: {
    backgroundColor: "#43A047",
  },
  actionButtonCancel: {
    backgroundColor: "#DC2626",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFF",
  },
  statsFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1976D2",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});