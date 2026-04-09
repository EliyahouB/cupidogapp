import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { createOrUpdateReview, getReviewByLead } from "../../../utils/marketplace";
import i18n from "../../../utils/i18n";

export default function RateService({ route, navigation }) {
  const { lead } = route.params;
  
  const [rating, setRating] = useState(0);
  const [existingRating, setExistingRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExistingRating();
  }, []);

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const loadExistingRating = async () => {
    setLoading(true);
    try {
      const review = await getReviewByLead(lead.id);
      if (review) {
        setExistingRating(review);
        setRating(review.rating);
      }
    } catch (error) {
      console.error("Erreur loadExistingRating:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString(getLocale());
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(i18n.t("error"), i18n.t("please_select_rating"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrUpdateReview({
        leadId: lead.id,
        serviceId: lead.serviceId,
        providerId: lead.providerId,
        customerId: lead.customerId,
        rating,
      });

      if (result.success) {
        Alert.alert(
          i18n.t("success"),
          result.updated ? i18n.t("rating_updated") : i18n.t("thank_you_for_rating"),
          [{ text: i18n.t("ok"), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(i18n.t("error"), i18n.t("error_saving_rating"));
      }
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return i18n.t("very_unsatisfied");
      case 2: return i18n.t("unsatisfied");
      case 3: return i18n.t("average");
      case 4: return i18n.t("satisfied");
      case 5: return i18n.t("very_satisfied");
      default: return i18n.t("select_rating");
    }
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("rate_provider")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("rate_provider")} navigation={navigation} showBack>
      <View style={styles.container}>
        
        <View style={styles.serviceCard}>
          <LinearGradient
            colors={["#1976D2", "#42A5F5"]}
            style={styles.serviceHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="store" size={32} color="#FFF" />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{lead.providerName}</Text>
              <Text style={styles.serviceDate}>{i18n.t("request_from")} {formatDate(lead.createdAt)}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>
            {existingRating ? i18n.t("edit_your_rating") : i18n.t("how_was_your_experience")}
          </Text>
          <Text style={styles.messageText}>
            {existingRating ? i18n.t("can_edit_anytime") : i18n.t("your_review_helps_others")}
          </Text>
        </View>

        <View style={styles.ratingSection}>
          <View style={styles.starsRow}>
            <TouchableOpacity onPress={() => setRating(1)} style={styles.starButton}>
              <MaterialCommunityIcons name={rating >= 1 ? "star" : "star-outline"} size={48} color={rating >= 1 ? "#FFD700" : "#D1D5DB"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRating(2)} style={styles.starButton}>
              <MaterialCommunityIcons name={rating >= 2 ? "star" : "star-outline"} size={48} color={rating >= 2 ? "#FFD700" : "#D1D5DB"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRating(3)} style={styles.starButton}>
              <MaterialCommunityIcons name={rating >= 3 ? "star" : "star-outline"} size={48} color={rating >= 3 ? "#FFD700" : "#D1D5DB"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRating(4)} style={styles.starButton}>
              <MaterialCommunityIcons name={rating >= 4 ? "star" : "star-outline"} size={48} color={rating >= 4 ? "#FFD700" : "#D1D5DB"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRating(5)} style={styles.starButton}>
              <MaterialCommunityIcons name={rating >= 5 ? "star" : "star-outline"} size={48} color={rating >= 5 ? "#FFD700" : "#D1D5DB"} />
            </TouchableOpacity>
          </View>
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        {existingRating && (
          <View style={styles.existingInfo}>
            <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
            <Text style={styles.existingText}>{i18n.t("current_rating")} : {existingRating.rating}/5</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={rating === 0 ? ["#9CA3AF", "#9CA3AF"] : ["#1976D2", "#42A5F5"]}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={styles.submitContent}>
                <MaterialCommunityIcons name={existingRating ? "pencil" : "check"} size={20} color="#FFF" />
                <Text style={styles.submitText}>{existingRating ? i18n.t("edit_my_rating") : i18n.t("send_my_rating")}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
  messageBox: {
    marginBottom: 32,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    textAlign: "center",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#003366",
  },
  existingInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  existingText: {
    fontSize: 14,
    color: "#1976D2",
    marginLeft: 8,
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginLeft: 8,
  },
});