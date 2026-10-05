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
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth } from "../../../config/firebase";
import { getLeadsByCustomer } from "../../../utils/marketplace";
import i18n from "../../../utils/i18n";

export default function MyLeads({ navigation }) {
  const user = auth.currentUser;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    setLoading(true);
    try {
      const data = await getLeadsByCustomer(user.uid);
      setLeads(data);
    } catch (error) {
      console.error("Erreur loadLeads:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const canRate = (lead) => {
    if (!lead.canRateAfter) return false;
    const canRateDate = lead.canRateAfter.toDate
      ? lead.canRateAfter.toDate()
      : new Date(lead.canRateAfter);
    return new Date() >= canRateDate;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const daysUntilCanRate = (lead) => {
    if (!lead.canRateAfter) return 0;
    const canRateDate = lead.canRateAfter.toDate
      ? lead.canRateAfter.toDate()
      : new Date(lead.canRateAfter);
    const now = new Date();
    const diff = canRateDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 0;
    return days;
  };

  const getCategoryIcon = (category) => {
    if (category === "veterinaire") return "medical-bag";
    if (category === "toiletteur") return "content-cut";
    if (category === "dogwalker") return "walk";
    if (category === "educateur") return "school";
    if (category === "pension") return "home-heart";
    if (category === "transport") return "car";
    if (category === "photographe") return "camera";
    return "store";
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_requests")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{i18n.t("loading")}...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (leads.length === 0) {
    return (
      <ScreenLayout title={i18n.t("my_requests")} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{i18n.t("no_requests")}</Text>
          <Text style={styles.emptyText}>{i18n.t("no_provider_contacted_yet")}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("ServicesHome")}
          >
            <Text style={styles.emptyButtonText}>{i18n.t("discover_services")}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("my_requests")} navigation={navigation} showBack>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
          <Text style={styles.infoText}>{i18n.t("can_rate_after_10_days")}</Text>
        </View>

        <View style={styles.leadsList}>
          {leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              
              <View style={styles.leadHeader}>
                <View style={styles.leadIcon}>
                  <MaterialCommunityIcons 
                    name={getCategoryIcon(lead.category)} 
                    size={24} 
                    color="#1976D2" 
                  />
                </View>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.providerName}</Text>
                  <Text style={styles.leadDate}>{formatDate(lead.createdAt)}</Text>
                </View>
                {lead.hasBeenRated && (
                  <View style={styles.ratedBadge}>
                    <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratedText}>{i18n.t("rated")}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.leadMessage} numberOfLines={2}>{lead.message}</Text>

              {canRate(lead) && (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => navigation.navigate("RateService", { lead: lead })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={lead.hasBeenRated ? ["#6B7280", "#9CA3AF"] : ["#FFD700", "#FFC107"]}
                    style={styles.rateGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons 
                      name={lead.hasBeenRated ? "pencil" : "star"} 
                      size={18} 
                      color={lead.hasBeenRated ? "#FFF" : "#003366"} 
                    />
                    <Text style={[styles.rateButtonText, lead.hasBeenRated && styles.rateButtonTextWhite]}>
                      {lead.hasBeenRated ? i18n.t("edit_my_rating") : i18n.t("rate_this_provider")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!canRate(lead) && (
                <View style={styles.waitingBox}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
                  <Text style={styles.waitingText}>
                    {i18n.t("can_rate_in")} {daysUntilCanRate(lead)} {daysUntilCanRate(lead) > 1 ? i18n.t("days") : i18n.t("day")}
                  </Text>
                </View>
              )}

            </View>
          ))}
        </View>

      </ScrollView>
    </ScreenLayout>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1976D2",
    marginLeft: 10,
  },
  leadsList: {
    gap: 16,
  },
  leadCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  leadHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  leadIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 2,
  },
  leadDate: {
    fontSize: 13,
    color: "#6B7280",
  },
  ratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B8860B",
    marginLeft: 4,
  },
  leadMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  rateButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  rateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#003366",
    marginLeft: 8,
  },
  rateButtonTextWhite: {
    color: "#FFF",
  },
  waitingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 10,
  },
  waitingText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
});