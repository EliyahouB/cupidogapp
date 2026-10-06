import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import i18n from "../utils/i18n";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.60;

export default function Abonnements({ navigation }) {
  const [currentPlan, setCurrentPlan] = useState("gratuit");
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProPlan, setSelectedProPlan] = useState(null);
  const [userType, setUserType] = useState("particulier");
  const [providerType, setProviderType] = useState(null);
  const scrollViewRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(1);

  useEffect(() => {
    const loadUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const userData = profileSnap.data();
          setCurrentPlan(userData.abonnement || userData.subscription || "gratuit");
          setUserType(userData.userType || "particulier");
          setProviderType(userData.providerType || null);
        }
      } catch (error) {
        console.log("Erreur chargement profil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleSelectPlan = (planName, price) => {
    const planMap = {
      "Vente": { plan: "vente", price: 99, originalPrice: null },
      "Saillie": { plan: "saillie", price: 149, originalPrice: null },
      "Essentiel": { plan: "essentiel", price: 249, originalPrice: null },
      "Premium": { plan: "premium", price: 399, originalPrice: null },
    };
    
    const planInfo = planMap[planName];
    if (planInfo) {
      navigation.navigate("PaymentScreen", {
        plan: planInfo.plan,
        price: planInfo.price,
        originalPrice: planInfo.originalPrice,
      });
    }
  };

  const handleBoost = (boostType, price) => {
    const priceNumber = parseInt(price.replace("₪", ""));
    navigation.navigate("PaymentScreen", {
      plan: boostType,
      price: priceNumber,
      originalPrice: null,
    });
  };

  const handleProPlanClick = (plan) => {
    setSelectedProPlan(plan);
    setModalVisible(true);
  };

  const handleSubscribeProPlan = () => {
    setModalVisible(false);
    
    const planPrices = {
      freemium: { price: 0, originalPrice: null },
      pro: { price: 159, originalPrice: 249 },
      pro_plus: { price: 299, originalPrice: 399 },
    };
    
    const planInfo = planPrices[selectedProPlan];
    
    if (selectedProPlan === "freemium") {
      Alert.alert(i18n.t("success"), i18n.t("start_free"));
      return;
    }
    
    navigation.navigate("PaymentScreen", {
      plan: selectedProPlan,
      price: planInfo.price,
      originalPrice: planInfo.originalPrice,
    });
  };

  const isSubscribed = (plan) => {
    return currentPlan === plan;
  };

  const hasSubscription = () => {
    return ["essentiel", "premium", "pro", "pro_plus", "freemium"].includes(currentPlan);
  };

  const isPrestataire = () => {
    return userType === "professionnel" && providerType === "prestataire";
  };

  const isVendeur = () => {
    return userType === "professionnel" && providerType === "vendeur";
  };

  const isParticulier = () => {
    return userType === "particulier";
  };

  const getProPlanDetails = (plan) => {
    if (plan === "freemium") {
      return {
        name: "FREEMIUM",
        price: "0₪",
        duration: i18n.t("free"),
        features: [
          i18n.t("create_service"),
          i18n.t("my_leads"),
          "65₪/lead",
          i18n.t("cancel_anytime"),
        ],
      };
    } else if (plan === "pro") {
      return {
        name: "PRO",
        price: "159₪",
        duration: i18n.t("per_month"),
        features: [
          i18n.t("create_service"),
          i18n.t("my_leads"),
          "18-20₪/lead",
          "3 photos",
        ],
      };
    } else {
      return {
        name: "PRO+",
        price: "299₪",
        duration: i18n.t("per_month"),
        features: [
          "PRO +",
          "Badge PRO+ 🏆",
          "13-15₪/lead (-25%)",
          i18n.t("recommended"),
        ],
      };
    }
  };

  const prestataireePlans = [
    {
      id: "freemium",
      name: "FREEMIUM",
      price: "0₪",
      duration: i18n.t("free"),
      leadPrice: "65₪/lead",
      icon: "account-outline",
      emoji: "🐾",
      gradient: ["#81D4FA", "#4FC3F7", "#29B6F6", "#03A9F4"],
      features: [i18n.t("profile"), i18n.t("my_leads"), "65₪/lead", i18n.t("cancel_anytime")],
    },
    {
      id: "pro",
      name: "PRO",
      price: "159₪",
      duration: i18n.t("per_month"),
      leadPrice: "18-20₪/lead",
      icon: "briefcase",
      gradient: ["#03A9F4", "#039BE5", "#0288D1", "#0277BD"],
      features: [i18n.t("profile"), i18n.t("my_leads"), "18-20₪/lead", "3 photos"],
    },
    {
      id: "pro_plus",
      name: "PRO+",
      price: "299₪",
      duration: i18n.t("per_month"),
      leadPrice: "13-15₪/lead",
      icon: "crown",
      gradient: ["#0277BD", "#01579B", "#014A7F", "#013A63"],
      features: ["PRO +", "Badge 🏆", "13-15₪/lead", i18n.t("recommended")],
      badge: "⭐ PREMIUM",
    },
  ];

  const handleScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / CARD_WIDTH);
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("subscriptions")} navigation={navigation} showBack>
        <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        </LinearGradient>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("subscriptions")} navigation={navigation} showBack>
      <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION PRESTATAIRE */}
          {isPrestataire() && (
            <>
              <View style={styles.header}>
                <Image 
                  source={require("../assets/logo_service_premium.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>{i18n.t("pro_offers")}</Text>
                <Text style={styles.headerSubtitle}>{i18n.t("pro_subtitle")}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("subscriptions")}</Text>
                <Text style={styles.sectionSubtitle}>{i18n.t("swipe_offers")}</Text>

                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + 12}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselContainer}
                  onMomentumScrollEnd={handleScrollEnd}
                  contentOffset={{ x: CARD_WIDTH + 12, y: 0 }}
                >
                  {prestataireePlans.map((plan, index) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.carouselCard,
                        isSubscribed(plan.id) && styles.carouselCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => !isSubscribed(plan.id) && handleProPlanClick(plan.id)}
                    >
                      <LinearGradient
                        colors={plan.gradient}
                        style={styles.carouselCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      >
                        {plan.badge && (
                          <View style={styles.proPlusBadge}>
                            <Text style={styles.proPlusBadgeText}>{plan.badge}</Text>
                          </View>
                        )}
                        {isSubscribed(plan.id) && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>✓ {i18n.t("current_plan")}</Text>
                          </View>
                        )}
                        {plan.emoji && <Text style={styles.planEmoji}>{plan.emoji}</Text>}
                        <View style={{ marginTop: 10 }}>
                          <MaterialCommunityIcons name={plan.icon} size={36} color="#FFF" />
                        </View>
                        <Text style={styles.carouselCardTitle}>{plan.name}</Text>
                        <Text style={styles.carouselCardPrice}>{plan.price}</Text>
                        <Text style={styles.carouselCardDuration}>{plan.duration}</Text>
                        <View style={styles.carouselCardDivider} />
                        <Text style={styles.carouselCardLeadPrice}>{plan.leadPrice}</Text>
                        <View style={styles.carouselCardFeatures}>
                          {plan.features.map((feature, idx) => (
                            <Text key={idx} style={styles.carouselFeatureText}>• {feature}</Text>
                          ))}
                        </View>
                        {!isSubscribed(plan.id) && (
                          <TouchableOpacity 
                            style={styles.carouselButton}
                            onPress={() => handleProPlanClick(plan.id)}
                          >
                            <Text style={styles.carouselButtonText}>
                              {plan.id === "freemium" ? i18n.t("start_free") : i18n.t("subscribe")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.carouselIndicators}>
                  {prestataireePlans.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.carouselDot,
                        activeIndex === index && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚀 {i18n.t("boosts")}</Text>
                <Text style={styles.sectionSubtitle}>{i18n.t("boost_visibility")}</Text>
                
                <TouchableOpacity
                  style={styles.boostCard}
                  activeOpacity={0.8}
                  onPress={() => handleBoost(i18n.t("boost_3days"), "59₪")}
                >
                  <LinearGradient
                    colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                    style={styles.boostCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="rocket-launch" size={28} color="#FFF" />
                    <View style={styles.boostCardContent}>
                      <Text style={styles.boostCardTitle}>{i18n.t("boost_3days")}</Text>
                      <Text style={styles.boostCardDesc}>{i18n.t("boost_desc")}</Text>
                    </View>
                    <View style={styles.boostCardPriceContainer}>
                      <Text style={styles.boostCardPrice}>59₪</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boostCard, { marginTop: 12 }]}
                  activeOpacity={0.8}
                  onPress={() => handleBoost(i18n.t("boost_7days"), "99₪")}
                >
                  <LinearGradient
                    colors={['#7B1FA2', '#9C27B0', '#BA68C8']}
                    style={styles.boostCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="star-shooting" size={28} color="#FFF" />
                    <View style={styles.boostCardContent}>
                      <Text style={styles.boostCardTitle}>{i18n.t("boost_7days")}</Text>
                      <Text style={styles.boostCardDesc}>{i18n.t("boost_desc")}</Text>
                    </View>
                    <View style={styles.boostCardPriceContainer}>
                      <Text style={styles.boostCardPrice}>99₪</Text>
                      <View style={styles.boostBadge}>
                        <Text style={styles.boostBadgeText}>{i18n.t("popular")}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* SECTION VENDEUR */}
          {isVendeur() && (
            <>
              <View style={styles.header}>
                <Image 
                  source={require("../assets/logo_shop_short_premium.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>{i18n.t("vendor_space")}</Text>
                <Text style={styles.headerSubtitle}>{i18n.t("vendor_subtitle")}</Text>
              </View>

              <View style={styles.vendorInfoCard}>
                <LinearGradient
                  colors={["#E8F5E9", "#C8E6C9"]}
                  style={styles.vendorInfoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="store-check" size={32} color="#4CAF50" />
                  <Text style={styles.vendorInfoTitle}>🏪 {i18n.t("seller")} CupiDog</Text>
                  <View style={styles.vendorInfoList}>
                    <View style={styles.vendorInfoRow}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.vendorInfoText}>{i18n.t("unlimited_products")}</Text>
                    </View>
                    <View style={styles.vendorInfoRow}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.vendorInfoText}>{i18n.t("no_monthly_fee")}</Text>
                    </View>
                    <View style={styles.vendorInfoRow}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.vendorInfoText}>{i18n.t("commission")}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚀 {i18n.t("boost_sales")}</Text>
                <Text style={styles.sectionSubtitle}>{i18n.t("boost_products")}</Text>
                
                <TouchableOpacity
                  style={styles.boostCard}
                  activeOpacity={0.8}
                  onPress={() => handleBoost(i18n.t("boost_3days"), "59₪")}
                >
                  <LinearGradient
                    colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                    style={styles.boostCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="rocket-launch" size={28} color="#FFF" />
                    <View style={styles.boostCardContent}>
                      <Text style={styles.boostCardTitle}>{i18n.t("boost_3days")}</Text>
                      <Text style={styles.boostCardDesc}>{i18n.t("boost_desc")}</Text>
                    </View>
                    <View style={styles.boostCardPriceContainer}>
                      <Text style={styles.boostCardPrice}>59₪</Text>
                      <Text style={styles.boostCardPer}>{i18n.t("per_product")}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boostCard, { marginTop: 12 }]}
                  activeOpacity={0.8}
                  onPress={() => handleBoost(i18n.t("boost_7days"), "99₪")}
                >
                  <LinearGradient
                    colors={['#7B1FA2', '#9C27B0', '#BA68C8']}
                    style={styles.boostCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="star-shooting" size={28} color="#FFF" />
                    <View style={styles.boostCardContent}>
                      <Text style={styles.boostCardTitle}>{i18n.t("boost_7days")}</Text>
                      <Text style={styles.boostCardDesc}>{i18n.t("boost_desc")}</Text>
                    </View>
                    <View style={styles.boostCardPriceContainer}>
                      <Text style={styles.boostCardPrice}>99₪</Text>
                      <View style={styles.boostBadge}>
                        <Text style={styles.boostBadgeText}>{i18n.t("popular")}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* SECTION PARTICULIER */}
          {isParticulier() && (
            <>
              <View style={styles.header}>
                <MaterialCommunityIcons name="crown" size={48} color="#FFF" />
                <Text style={styles.headerTitle}>{i18n.t("choose_offer")}</Text>
                <Text style={styles.headerSubtitle}>{i18n.t("particulier_subtitle")}</Text>
              </View>

              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  activeOpacity={0.8}
                  onPress={() => handleBoost("Boost " + i18n.t("stud"), hasSubscription() ? "49₪" : "99₪")}
                >
                  <LinearGradient
                    colors={["#9C27B0", "#FF6B35", "#FF8C42"]}
                    style={styles.quickActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="rocket-launch" size={18} color="#FFF" />
                    <Text style={styles.quickActionBoost}>BOOST</Text>
                    <Text style={styles.quickActionTitle}>{i18n.t("stud")}</Text>
                    <Text style={styles.quickActionPrice}>
                      {hasSubscription() ? "49₪" : "99₪"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickActionCard}
                  activeOpacity={0.8}
                  onPress={() => handleBoost("Boost " + i18n.t("sale"), hasSubscription() ? "39₪" : "69₪")}
                >
                  <LinearGradient
                    colors={["#FF6B35", "#FF8C42", "#9C27B0"]}
                    style={styles.quickActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="flash" size={18} color="#FFF" />
                    <Text style={styles.quickActionBoost}>BOOST</Text>
                    <Text style={styles.quickActionTitle}>{i18n.t("sale")}</Text>
                    <Text style={styles.quickActionPrice}>
                      {hasSubscription() ? "39₪" : "69₪"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t("subscriptions")}</Text>

                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => handleSelectPlan("Vente", "99₪")}
                >
                  <LinearGradient
                    colors={["#E3F2FD", "#BBDEFB", "#90CAF9"]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.planEmoji}>💰</Text>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="sale" size={22} color="#1976D2" />
                        <Text style={styles.cardTitleDark}>{i18n.t("sale")}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardPriceDark}>99₪</Text>
                    <Text style={styles.cardDurationDark}>30 {i18n.t("days")}</Text>
                    <View style={styles.cardFeatures}>
                      <Text style={styles.featureTextDark}>• 1 {i18n.t("dogs")}</Text>
                      <Text style={styles.featureTextDark}>• 30 {i18n.t("days")}</Text>
                      <Text style={styles.featureTextDark}>• {i18n.t("filter")}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.buttonDark}
                      onPress={() => handleSelectPlan("Vente", "99₪")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buttonDarkText}>{i18n.t("publish")}</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => handleSelectPlan("Saillie", "149₪")}
                >
                  <LinearGradient
                    colors={["#0D47A1", "#7B1FA2", "#D81B60"]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.planEmoji}>❤️</Text>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="heart-multiple" size={22} color="#FFF" />
                        <Text style={styles.cardTitle}>{i18n.t("stud")}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardPrice}>149₪</Text>
                    <Text style={styles.cardDuration}>30 {i18n.t("days")}</Text>
                    <View style={styles.cardFeatures}>
                      <Text style={styles.featureText}>• 1 {i18n.t("dogs")}</Text>
                      <Text style={styles.featureText}>• {i18n.t("notifications")}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.buttonWhite}
                      onPress={() => handleSelectPlan("Saillie", "149₪")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buttonWhiteText}>{i18n.t("publish")}</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.card, styles.cardPopular]}
                  activeOpacity={0.9}
                  onPress={() => !isSubscribed("essentiel") && handleSelectPlan("Essentiel", "249₪/mois")}
                  disabled={isSubscribed("essentiel")}
                >
                  <LinearGradient
                    colors={["#F5F5F5", "#EEEEEE", "#E0E0E0"]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.badgePopular}>
                      <Text style={styles.badgePopularText}>⭐ {i18n.t("popular")}</Text>
                    </View>
                    <Text style={styles.planEmoji}>⭐</Text>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="star" size={22} color="#757575" />
                        <Text style={styles.cardTitleDark}>{i18n.t("essential")}</Text>
                      </View>
                      {isSubscribed("essentiel") && (
                        <View style={styles.badgeActive}>
                          <Text style={styles.badgeActiveText}>✓ {i18n.t("current_plan")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardPriceDark}>249₪</Text>
                    <Text style={styles.cardDurationDark}>{i18n.t("per_month")}</Text>
                    <View style={styles.cardFeatures}>
                      <Text style={styles.featureTextDark}>• 3 {i18n.t("dogs")} / {i18n.t("per_month")}</Text>
                      <Text style={styles.featureTextDark}>• 1 boost {i18n.t("free")}</Text>
                    </View>
                    {!isSubscribed("essentiel") && (
                      <TouchableOpacity
                        style={styles.buttonDark}
                        onPress={() => handleSelectPlan("Essentiel", "249₪/mois")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonDarkText}>{i18n.t("subscribe")}</Text>
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => !isSubscribed("premium") && handleSelectPlan("Premium", "399₪/mois")}
                  disabled={isSubscribed("premium")}
                >
                  <LinearGradient
                    colors={["#FFF9E1", "#FFF3C4", "#FFECB3"]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.planEmoji}>👑</Text>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="crown" size={22} color="#F57C00" />
                        <Text style={styles.cardTitleDark}>{i18n.t("premium")}</Text>
                      </View>
                      {isSubscribed("premium") && (
                        <View style={styles.badgeActive}>
                          <Text style={styles.badgeActiveText}>✓ {i18n.t("current_plan")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardPriceDark}>399₪</Text>
                    <Text style={styles.cardDurationDark}>{i18n.t("per_month")}</Text>
                    <View style={styles.cardFeatures}>
                      <Text style={styles.featureTextDark}>• {i18n.t("unlimited_products")}</Text>
                      <Text style={styles.featureTextDark}>• 3 boosts {i18n.t("free")}</Text>
                      <Text style={styles.featureTextDark}>• Badge 👑</Text>
                    </View>
                    {!isSubscribed("premium") && (
                      <TouchableOpacity
                        style={styles.buttonDark}
                        onPress={() => handleSelectPlan("Premium", "399₪/mois")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonDarkText}>{i18n.t("subscribe")}</Text>
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
            <Text style={styles.footerText}>{i18n.t("secure_payment_footer")}</Text>
          </View>
        </ScrollView>

        {/* MODAL DÉTAILS PRO */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={28} color="#666" />
              </TouchableOpacity>

              {selectedProPlan && (
                <>
                  <LinearGradient
                    colors={
                      selectedProPlan === "freemium" 
                        ? ["#81D4FA", "#29B6F6"] 
                        : selectedProPlan === "pro" 
                          ? ["#03A9F4", "#0288D1"] 
                          : ["#0277BD", "#01579B"]
                    }
                    style={styles.modalHeader}
                  >
                    <MaterialCommunityIcons 
                      name={
                        selectedProPlan === "freemium" 
                          ? "account-outline" 
                          : selectedProPlan === "pro" 
                            ? "briefcase" 
                            : "crown"
                      } 
                      size={40} 
                      color="#FFF" 
                    />
                    <Text style={styles.modalTitle}>{getProPlanDetails(selectedProPlan).name}</Text>
                    <Text style={styles.modalPrice}>{getProPlanDetails(selectedProPlan).price}</Text>
                    <Text style={styles.modalDuration}>{getProPlanDetails(selectedProPlan).duration}</Text>
                  </LinearGradient>

                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.modalFeaturesTitle}>{i18n.t("included")}:</Text>
                    {getProPlanDetails(selectedProPlan).features.map((feature, index) => (
                      <View key={index} style={styles.modalFeatureRow}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#43A047" />
                        <Text style={styles.modalFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.modalSubscribeButtonContainer}
                    onPress={handleSubscribeProPlan}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        selectedProPlan === "freemium" 
                          ? ["#81D4FA", "#29B6F6"] 
                          : selectedProPlan === "pro" 
                            ? ["#03A9F4", "#0288D1"] 
                            : ["#0277BD", "#01579B"]
                      }
                      style={styles.modalSubscribeButton}
                    >
                      <Text style={styles.modalSubscribeButtonText}>
                        {selectedProPlan === "freemium" ? i18n.t("start_free") : i18n.t("subscribe_offer")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 8,
  },
  logoImage: {
    width: 280,
    height: 100,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#FFF",
    textAlign: "center",
    opacity: 0.95,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    paddingHorizontal: (width - CARD_WIDTH) / 2 - 6,
  },
  carouselCard: {
    width: CARD_WIDTH,
    marginHorizontal: 6,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  carouselCardActive: {
    borderWidth: 3,
    borderColor: "#4CAF50",
  },
  carouselCardGradient: {
    padding: 12,
    alignItems: "center",
    paddingBottom: 16,
  },
  carouselCardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 2,
  },
  carouselCardPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 2,
  },
  carouselCardDuration: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
  carouselCardDivider: {
    width: 50,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginVertical: 6,
  },
  carouselCardLeadPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 6,
  },
  carouselCardFeatures: {
    alignItems: "center",
    marginBottom: 10,
  },
  carouselFeatureText: {
    fontSize: 13,
    color: "#FFF",
    marginBottom: 2,
  },
  carouselButton: {
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  carouselButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0288D1",
  },
  carouselIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  carouselDotActive: {
    backgroundColor: "#FFF",
    width: 24,
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 0,
    gap: 10,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionGradient: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  quickActionBoost: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
    letterSpacing: 1,
  },
  quickActionTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 1,
  },
  quickActionPrice: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
    marginBottom: 12,
  },
  proPlusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  proPlusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  currentBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  vendorInfoCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vendorInfoGradient: {
    padding: 20,
    alignItems: "center",
  },
  vendorInfoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 8,
    marginBottom: 16,
  },
  vendorInfoList: {
    width: "100%",
    gap: 10,
  },
  vendorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vendorInfoText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  boostCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  boostCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  boostCardContent: {
    flex: 1,
  },
  boostCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  boostCardDesc: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
  },
  boostCardPriceContainer: {
    alignItems: "center",
  },
  boostCardPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  boostCardPer: {
    fontSize: 11,
    color: "#FFF",
    opacity: 0.9,
  },
  boostBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  boostBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFF",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPopular: {
    borderWidth: 2,
    borderColor: "#FFB84D",
  },
  cardGradient: {
    padding: 12,
  },
  planEmoji: {
    alignSelf: "center",
    fontSize: 44,
    lineHeight: 54,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  badgePopular: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#FFB84D",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  badgePopularText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardTitleDark: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  badgeActive: {
    backgroundColor: "#06D6A0",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  cardPriceDark: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  cardDuration: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
    marginBottom: 10,
  },
  cardDurationDark: {
    fontSize: 12,
    color: "#555",
    marginBottom: 10,
  },
  cardFeatures: {
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    color: "#FFF",
    marginBottom: 3,
  },
  featureTextDark: {
    fontSize: 13,
    color: "#333",
    marginBottom: 3,
  },
  buttonWhite: {
    backgroundColor: "#FFF",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonWhiteText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
  },
  buttonDark: {
    backgroundColor: "#333",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDarkText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalHeader: {
    padding: 24,
    paddingTop: 40,
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 12,
  },
  modalPrice: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 8,
  },
  modalDuration: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
  },
  modalBody: {
    padding: 24,
  },
  modalFeaturesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  modalFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    lineHeight: 22,
  },
  modalSubscribeButtonContainer: {
    padding: 16,
    borderRadius: 12,
    overflow: "hidden",
    margin: 16,
  },
  modalSubscribeButton: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 12,
  },
  modalSubscribeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});