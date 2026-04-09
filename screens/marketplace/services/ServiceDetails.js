import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import i18n from "../../../utils/i18n";

const { width } = Dimensions.get("window");

export default function ServiceDetails({ route, navigation }) {
  const { serviceId } = route.params;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadService();
  }, []);

  const loadService = async () => {
    try {
      const docRef = doc(db, "marketplace_services", serviceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setService({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Erreur loadService:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryGradient = () => {
    const gradients = {
      veterinaire: ["#1565C0", "#1976D2", "#42A5F5"],
      toiletteur: ["#7B1FA2", "#8E24AA", "#AB47BC"],
      dogwalker: ["#00796B", "#00897B", "#26A69A"],
      educateur: ["#388E3C", "#43A047", "#66BB6A"],
      pension: ["#F57C00", "#FB8C00", "#FFA726"],
      transport: ["#C2185B", "#D81B60", "#EC407A"],
      photographe: ["#E64A19", "#F4511E", "#FF7043"],
    };
    return gradients[service?.category] || ["#1976D2", "#42A5F5"];
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("loading")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </ScreenLayout>
    );
  }

  if (!service) {
    return (
      <ScreenLayout title={i18n.t("error")} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="alert-circle" size={80} color="#9CA3AF" />
          <Text style={styles.emptyText}>{i18n.t("service_not_found")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={service.businessName} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.photosSection}>
          {service.photos && service.photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / width);
                  setCurrentPhotoIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {service.photos.map((photo, idx) => (
                  <Image key={idx} source={{ uri: photo }} style={styles.photo} />
                ))}
              </ScrollView>
              
              {service.photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {service.photos.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.photoIndicator,
                        currentPhotoIndex === idx && styles.photoIndicatorActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="image-off" size={60} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.businessName}>{service.businessName}</Text>
              {service.abonnement === "pro_plus" && (
                <View style={styles.proPlusBadge}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.proPlusBadgeText}>PRO+</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
            <Text style={styles.ratingText}>
              {service.rating?.toFixed(1) || i18n.t("new")}
            </Text>
            {service.reviewsCount > 0 && (
              <Text style={styles.reviewsCount}>({service.reviewsCount} {i18n.t("reviews")})</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t("about")}</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        {service.services && service.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("services_offered")}</Text>
            <View style={styles.servicesTags}>
              {service.services.map((s, idx) => (
                <View key={idx} style={styles.serviceTag}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#43A047" />
                  <Text style={styles.serviceTagText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t("practical_info")}</Text>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#1976D2" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{i18n.t("location")}</Text>
              <Text style={styles.infoValue}>{service.city}</Text>
              {service.zones && service.zones.length > 1 && (
                <Text style={styles.infoExtra}>
                  + {service.zones.length - 1} {i18n.t("other_cities")}
                </Text>
              )}
            </View>
          </View>

          {service.priceRange && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cash" size={20} color="#1976D2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{i18n.t("rates")}</Text>
                <Text style={styles.infoValue}>{service.priceRange}</Text>
              </View>
            </View>
          )}

          {service.phone && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color="#1976D2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{i18n.t("phone")}</Text>
                <Text style={styles.infoValue}>{service.phone}</Text>
              </View>
            </View>
          )}
        </View>

        {service.abonnement === "pro_plus" && (
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{service.totalLeadsReceived || 0}</Text>
              <Text style={styles.statLabel}>{i18n.t("requests_received")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {service.totalLeadsAccepted 
                  ? Math.round((service.totalLeadsAccepted / service.totalLeadsReceived) * 100) 
                  : 0}%
              </Text>
              <Text style={styles.statLabel}>{i18n.t("response_rate")}</Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.contactButtonContainer}
          onPress={() => navigation.navigate("LeadForm", { service })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={getCategoryGradient()}
            style={styles.contactButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="email-fast" size={22} color="#FFF" />
            <Text style={styles.contactButtonText}>{i18n.t("request_quote")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  photosSection: {
    position: "relative",
  },
  photo: {
    width: width,
    height: 250,
    backgroundColor: "#E5E7EB",
  },
  photoPlaceholder: {
    width: width,
    height: 250,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  photoIndicators: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  photoIndicatorActive: {
    backgroundColor: "#FFF",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  businessName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
  },
  proPlusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  proPlusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F57C00",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  reviewsCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
  },
  servicesTags: {
    gap: 10,
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceTagText: {
    fontSize: 14,
    color: "#003366",
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#003366",
  },
  infoExtra: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statsSection: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#1976D2",
    textAlign: "center",
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
  contactButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});