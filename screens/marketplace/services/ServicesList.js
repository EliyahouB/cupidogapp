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
import { getServicesByCategory, getAllServices } from "../../../utils/marketplace";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

export default function ServicesList({ route, navigation }) {
  const { category, categoryName } = route.params;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    let data;
    
    if (category === "all" || !category) {
      data = await getAllServices();
    } else {
      data = await getServicesByCategory(category);
    }
    
    setServices(data);
    setLoading(false);
  };

  const getCategoryGradient = (cat) => {
    const gradients = {
      veterinaire: ["#1565C0", "#1976D2", "#42A5F5"],
      toiletteur: ["#7B1FA2", "#8E24AA", "#AB47BC"],
      dogwalker: ["#00796B", "#00897B", "#26A69A"],
      educateur: ["#388E3C", "#43A047", "#66BB6A"],
      pension: ["#F57C00", "#FB8C00", "#FFA726"],
      transport: ["#C2185B", "#D81B60", "#EC407A"],
      photographe: ["#E64A19", "#F4511E", "#FF7043"],
    };
    return gradients[cat] || ["#1976D2", "#42A5F5"];
  };

  if (loading) {
    return (
      <ScreenLayout title={categoryName} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Chargement des prestataires...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (services.length === 0) {
    return (
      <ScreenLayout title={categoryName} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="store-off" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Aucun prestataire</Text>
          <Text style={styles.emptyText}>
            Soyez le premier à proposer vos services !
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("CreateService")}
          >
            <Text style={styles.emptyButtonText}>Devenir prestataire</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={categoryName} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{services.length} prestataire{services.length > 1 ? "s" : ""} disponible{services.length > 1 ? "s" : ""}</Text>
          <Text style={styles.headerSubtitle}>Triés par pertinence</Text>
        </View>

        <View style={styles.servicesList}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("ServiceDetails", { serviceId: service.id })}
            >
              <View style={styles.photoCover}>
                {service.photos && service.photos.length > 0 ? (
                  <Image 
                    source={{ uri: service.photos[0] }} 
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={getCategoryGradient(service.category)}
                    style={styles.coverGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="image-off" size={50} color="rgba(255,255,255,0.6)" />
                  </LinearGradient>
                )}

                {service.abonnement === "pro_plus" && (
                  <View style={styles.proPlusBadge}>
                    <MaterialCommunityIcons name="star" size={12} color="#FFD700" />
                    <Text style={styles.proPlusBadgeText}>PRO+</Text>
                  </View>
                )}

                {(category === "all" || !category) && service.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.businessName} numberOfLines={1}>
                  {service.businessName}
                </Text>

                {service.rating > 0 && (
                  <View style={styles.ratingRow}>
                    <View style={styles.starsRow}>
                      <MaterialCommunityIcons name={service.rating >= 1 ? "star" : "star-outline"} size={18} color="#FFD700" />
                      <MaterialCommunityIcons name={service.rating >= 2 ? "star" : "star-outline"} size={18} color="#FFD700" />
                      <MaterialCommunityIcons name={service.rating >= 3 ? "star" : "star-outline"} size={18} color="#FFD700" />
                      <MaterialCommunityIcons name={service.rating >= 4 ? "star" : "star-outline"} size={18} color="#FFD700" />
                      <MaterialCommunityIcons name={service.rating >= 5 ? "star" : "star-outline"} size={18} color="#FFD700" />
                    </View>
                    <Text style={styles.reviewsCountText}>({service.reviewsCount} avis)</Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{service.city}</Text>
                  </View>
                </View>

                {service.description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {service.description}
                  </Text>
                )}

                {service.services && service.services.length > 0 && (
                  <View style={styles.servicesTagsRow}>
                    {service.services.slice(0, 2).map((s, idx) => (
                      <View key={idx} style={styles.serviceTag}>
                        <Text style={styles.serviceTagText}>{s}</Text>
                      </View>
                    ))}
                    {service.services.length > 2 && (
                      <Text style={styles.moreServices}>+{service.services.length - 2}</Text>
                    )}
                  </View>
                )}

                {service.priceRange && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Tarifs :</Text>
                    <Text style={styles.priceValue}>{service.priceRange}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CreateService")}
        >
          <LinearGradient
            colors={["#1976D2", "#42A5F5"]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="account-star" size={32} color="#FFF" />
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Vous êtes prestataire ?</Text>
              <Text style={styles.ctaText}>Inscrivez-vous et développez votre activité</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

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
    padding: 40,
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  servicesList: {
    gap: 20,
    marginBottom: 24,
  },
  serviceCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoCover: {
    width: CARD_WIDTH,
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  proPlusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  proPlusBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoSection: {
    padding: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewsCountText: {
    fontSize: 13,
    color: "#6B7280",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  servicesTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  serviceTagText: {
    fontSize: 11,
    color: "#1976D2",
    fontWeight: "600",
  },
  moreServices: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    alignSelf: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  priceLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#003366",
  },
  ctaCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  ctaText: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.95,
  },
});