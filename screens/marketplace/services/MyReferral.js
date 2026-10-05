import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth } from "../../../config/firebase";
import {
  getReferralByUserId,
  createReferralCode,
  getReferralHistory,
  calculateRewards,
} from "../../../utils/referral";
import i18n from "../../../utils/i18n";

export default function MyReferral({ navigation }) {
  const user = auth.currentUser;
  const [referral, setReferral] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadReferral();
  }, []);

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const loadReferral = async () => {
    setLoading(true);
    try {
      const data = await getReferralByUserId(user.uid);
      setReferral(data);

      if (data) {
        const historyData = await getReferralHistory(data.id);
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Erreur loadReferral:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    setCreating(true);
    try {
      const result = await createReferralCode(user.uid, "CUPIDOG");
      if (result.success) {
        Alert.alert(i18n.t("code_created"), i18n.t("your_referral_code") + " : " + result.code);
        loadReferral();
      } else {
        Alert.alert(i18n.t("error"), result.error);
      }
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("error_creating_code"));
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referral.code);
    Alert.alert(i18n.t("copied"), i18n.t("code_copied_clipboard"));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: i18n.t("join_cupidog_with_code") + " : " + referral.code + "\n\n" + i18n.t("download_app") + " : https://cupidog.app",
      });
    } catch (error) {
      console.error("Erreur share:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_referral")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{i18n.t("loading")}...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!referral) {
    return (
      <ScreenLayout title={i18n.t("my_referral")} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-group" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{i18n.t("no_referral_code_yet")}</Text>
          <Text style={styles.emptyText}>
            {i18n.t("create_code_earn_rewards")}
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateCode}
            disabled={creating}
          >
            <LinearGradient
              colors={["#1976D2", "#42A5F5"]}
              style={styles.createGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  <Text style={styles.createButtonText}>{i18n.t("create_my_referral_code")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const rewards = calculateRewards(referral.points);

  return (
    <ScreenLayout title={i18n.t("my_referral")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>

        {referral.isFounder && (
          <View style={styles.founderBadge}>
            <MaterialCommunityIcons name="star-circle" size={24} color="#FFD700" />
            <Text style={styles.founderText}>{i18n.t("founding_partner")}</Text>
          </View>
        )}

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{i18n.t("your_referral_code")}</Text>
          <Text style={styles.codeValue}>{referral.code}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
              <MaterialCommunityIcons name="content-copy" size={20} color="#1976D2" />
              <Text style={styles.codeButtonText}>{i18n.t("copy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeButton} onPress={handleShare}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#1976D2" />
              <Text style={styles.codeButtonText}>{i18n.t("share")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referral.points}</Text>
            <Text style={styles.statLabel}>{i18n.t("points")}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referral.totalReferrals}</Text>
            <Text style={styles.statLabel}>{i18n.t("referees")}</Text>
          </View>
        </View>

        <View style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>{i18n.t("your_rewards")}</Text>
          
          <View style={styles.rewardRow}>
            <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#1976D2" />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>{i18n.t("free_leads_earned")}</Text>
              <Text style={styles.rewardValue}>{referral.freeLeadsEarned || 0} {i18n.t("leads")}</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <MaterialCommunityIcons name="rocket-launch" size={24} color="#FB8C00" />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>{i18n.t("boosts_earned")}</Text>
              <Text style={styles.rewardValue}>{referral.boostsEarned || 0} {i18n.t("boosts")}</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <MaterialCommunityIcons name="calendar-check" size={24} color="#43A047" />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>{i18n.t("free_months_earned")}</Text>
              <Text style={styles.rewardValue}>{referral.freeMonthsEarned || 0} {i18n.t("months")}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>{i18n.t("next_rewards")}</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{i18n.t("next_2_free_leads_in")}</Text>
              <Text style={styles.progressValue}>{rewards.nextFreeLeads} {i18n.t("points")}</Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{i18n.t("next_boost_in")}</Text>
              <Text style={styles.progressValue}>{rewards.nextBoost} {i18n.t("points")}</Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{i18n.t("next_free_month_in")}</Text>
              <Text style={styles.progressValue}>{rewards.nextFreeMonth} {i18n.t("points")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>{i18n.t("how_it_works")}</Text>
          <View style={styles.howStep}>
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>1</Text>
            </View>
            <Text style={styles.howText}>{i18n.t("share_code_with_clients")}</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>2</Text>
            </View>
            <Text style={styles.howText}>{i18n.t("they_signup_with_code")}</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>3</Text>
            </View>
            <Text style={styles.howText}>{i18n.t("earn_1_point_per_signup")}</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>4</Text>
            </View>
            <Text style={styles.howText}>{i18n.t("points_rewards_info")}</Text>
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{i18n.t("recent_referees")}</Text>
            {history.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.historyRow}>
                <MaterialCommunityIcons name="account-check" size={20} color="#43A047" />
                <Text style={styles.historyName}>{item.referredUserName}</Text>
                <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}

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
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
  founderBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9E6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  founderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#B8860B",
  },
  codeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#003366",
    letterSpacing: 2,
    marginBottom: 16,
  },
  codeActions: {
    flexDirection: "row",
    gap: 16,
  },
  codeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976D2",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  rewardsCard: {
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
  rewardsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
    marginTop: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: "#6B7280",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1976D2",
  },
  howItWorks: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  howTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  howStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  howNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1976D2",
    justifyContent: "center",
    alignItems: "center",
  },
  howNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  howText: {
    flex: 1,
    fontSize: 14,
    color: "#003366",
  },
  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  historyName: {
    flex: 1,
    fontSize: 14,
    color: "#003366",
  },
  historyDate: {
    fontSize: 12,
    color: "#6B7280",
  },
});