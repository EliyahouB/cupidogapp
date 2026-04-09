import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "./ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import PremiumBadge from "./PremiumBadge";
import { getReferralByUserId } from "../utils/referral";
import i18n from "../utils/i18n";

export default function ProfileMenu({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [isProfessional, setIsProfessional] = useState(false);
  const [activityType, setActivityType] = useState(null);
  const [userType, setUserType] = useState("particulier");
  const [providerType, setProviderType] = useState(null);
  const [referralPoints, setReferralPoints] = useState(0);
  const [stats, setStats] = useState({
    leadsCount: 0,
    ordersCount: 0,
    productsCount: 0,
    purchasesCount: 0,
    myLeadsCount: 0,
  });

  useEffect(() => {
    loadProfile();
    loadMarketplaceStats();
  }, []);

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, "profiles"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setProfile(data);
        setAbonnement(data.abonnement || data.subscription || "gratuit");
        setUserType(data.userType || "particulier");
        setProviderType(data.providerType || null);
      }

      const referral = await getReferralByUserId(user.uid);
      if (referral) {
        setReferralPoints(referral.points);
      }
    } catch (error) {
      console.log("Erreur chargement profil :", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplaceStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const proDoc = await getDoc(doc(db, "professional_accounts", user.uid));
      const hasProfessionalAccount = proDoc.exists() && proDoc.data().status === "approved";
      const userActivityType = proDoc.exists() ? proDoc.data().activityType : null;

      setIsProfessional(hasProfessionalAccount);
      setActivityType(userActivityType);

      let leadsCount = 0;
      if (userActivityType === "service_provider") {
        const leadsQuery = query(
          collection(db, "marketplace_leads"),
          where("providerId", "==", user.uid)
        );
        const leadsSnap = await getDocs(leadsQuery);
        leadsCount = leadsSnap.size;
      }

      let productsCount = 0;
      if (userActivityType === "seller") {
        const productsQuery = query(
          collection(db, "marketplace_products"),
          where("sellerId", "==", user.uid)
        );
        const productsSnap = await getDocs(productsQuery);
        productsCount = productsSnap.size;
      }

      let ordersCount = 0;
      if (userActivityType === "seller") {
        const ordersQuery = collection(db, "marketplace_orders");
        const ordersSnap = await getDocs(ordersQuery);
        
        ordersSnap.forEach(doc => {
          const order = doc.data();
          if (order.items && Array.isArray(order.items)) {
            const hasMyProduct = order.items.some(item => item.sellerId === user.uid);
            if (hasMyProduct) ordersCount++;
          }
        });
      }

      const purchasesQuery = query(
        collection(db, "invoices"),
        where("customerId", "==", user.uid),
        where("type", "==", "customer_invoice")
      );
      const purchasesSnap = await getDocs(purchasesQuery);
      const purchasesCount = purchasesSnap.size;

      const myLeadsQuery = query(
        collection(db, "marketplace_leads"),
        where("customerId", "==", user.uid)
      );
      const myLeadsSnap = await getDocs(myLeadsQuery);
      const myLeadsCount = myLeadsSnap.size;

      setStats({
        leadsCount,
        ordersCount,
        productsCount,
        purchasesCount,
        myLeadsCount,
      });
    } catch (error) {
      console.log("Erreur stats marketplace :", error);
    }
  };

  const hasSubscription = () => {
    return ["essentiel", "premium", "pro", "pro_plus"].includes(abonnement);
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

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("profile")} navigation={navigation} active="profile">
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout title={i18n.t("profile")} navigation={navigation} active="profile">
        <View style={styles.loading}>
          <MaterialCommunityIcons name="account-off" size={80} color="#9CA3AF" />
          <Text style={styles.errorText}>{i18n.t("profile_not_found")}</Text>
          <TouchableOpacity 
            style={styles.createButtonContainer}
            onPress={() => navigation.navigate("Profile")}
          >
            <LinearGradient
              colors={["#FF6B35", "#FF5722"]}
              style={styles.createButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.createButtonText}>{i18n.t("create_profile")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={i18n.t("profile")} navigation={navigation} active="profile">
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER PHOTO + NOM */}
        <View style={styles.profileHeader}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={75} color="#FFF" />
            </View>
          )}
          <Text style={styles.name}>{profile.name || profile.displayName || i18n.t("my_profile")}</Text>
          <PremiumBadge abonnement={abonnement} size="medium" />
          
          {isPrestataire() && (
            <View style={styles.typeBadge}>
              <MaterialCommunityIcons name="briefcase" size={14} color="#1976D2" />
              <Text style={styles.typeBadgeText}>{i18n.t("provider")}</Text>
            </View>
          )}
          {isVendeur() && (
            <View style={[styles.typeBadge, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons name="store" size={14} color="#4CAF50" />
              <Text style={[styles.typeBadgeText, { color: "#4CAF50" }]}>{i18n.t("seller")}</Text>
            </View>
          )}
        </View>

        {/* SECTION PARTICULIER */}
        {isParticulier() && (
          <>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Abonnements")}
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
                onPress={() => navigation.navigate("Abonnements")}
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

            <TouchableOpacity
              style={styles.featuredCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Abonnements")}
            >
              <LinearGradient
                colors={["#FFD700", "#FFA500", "#9C27B0", "#7B1FA2"]}
                style={styles.featuredGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>{i18n.t("early_bird")}</Text>
                </View>
                <View style={styles.featuredMain}>
                  <View style={styles.featuredLeft}>
                    <MaterialCommunityIcons name="heart-multiple" size={26} color="#FFF" />
                    <View style={styles.featuredText}>
                      <Text style={styles.featuredTitle}>{i18n.t("stud")} !</Text>
                      <Text style={styles.featuredSubtitle}>Geoloc - Alertes - 48h</Text>
                      <Text style={styles.featuredPrice}>149₪</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.featuredButton}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("Abonnements")}
                  >
                    <LinearGradient
                      colors={["#FFF", "#F5F5F5"]}
                      style={styles.featuredButtonGradient}
                    >
                      <Text style={styles.featuredButtonText}>GO !</Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color="#7B1FA2" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* SECTION PRESTATAIRE */}
        {isPrestataire() && (
          <>
            <TouchableOpacity
              style={styles.proBoostCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Abonnements")}
            >
              <LinearGradient
                colors={["#9C27B0", "#E040FB"]}
                style={styles.proBoostGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFF" />
                <View style={styles.proBoostContent}>
                  <Text style={styles.proBoostTitle}>BOOST {i18n.t("profile")}</Text>
                  <Text style={styles.proBoostSubtitle}>{i18n.t("boost_7days")}</Text>
                </View>
                <Text style={styles.proBoostPrice}>{hasSubscription() ? "39₪" : "59₪"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subscriptionBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Abonnements")}
            >
              <LinearGradient
                colors={["#1976D2", "#42A5F5"]}
                style={styles.subscriptionBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="crown" size={20} color="#FFF" />
                <Text style={styles.subscriptionBannerText}>{i18n.t("manage_subscriptions")}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dashboardSection}>
              <Text style={styles.sectionTitle}>{i18n.t("my_leads")}</Text>
              <MenuItem
                icon="briefcase"
                label={i18n.t("my_leads")}
                badge={stats.leadsCount > 0 ? stats.leadsCount : null}
                onPress={() => navigation.navigate("MesLeads")}
              />
              <MenuItem
                icon="plus-circle"
                label={i18n.t("create_service")}
                onPress={() => navigation.navigate("CreateService")}
              />
              <MenuItem
                icon="file-document"
                label={i18n.t("my_invoices")}
                onPress={() => navigation.navigate("MesFactures")}
              />
              <MenuItem
                icon="account-group"
                label={i18n.t("my_referral")}
                badge={referralPoints > 0 ? referralPoints : null}
                onPress={() => navigation.navigate("MyReferral")}
                hideBorder
              />
            </View>
          </>
        )}

        {/* SECTION VENDEUR */}
        {isVendeur() && (
          <>
            <TouchableOpacity
              style={styles.proBoostCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Abonnements")}
            >
              <LinearGradient
                colors={["#FF6B35", "#FF8C42"]}
                style={styles.proBoostGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="flash" size={24} color="#FFF" />
                <View style={styles.proBoostContent}>
                  <Text style={styles.proBoostTitle}>BOOST {i18n.t("products")}</Text>
                  <Text style={styles.proBoostSubtitle}>{i18n.t("boost_7days")}</Text>
                </View>
                <Text style={styles.proBoostPrice}>29₪</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subscriptionBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Abonnements")}
            >
              <LinearGradient
                colors={["#4CAF50", "#66BB6A"]}
                style={styles.subscriptionBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="crown" size={20} color="#FFF" />
                <Text style={styles.subscriptionBannerText}>{i18n.t("manage_subscriptions")}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dashboardSection}>
              <Text style={styles.sectionTitle}>{i18n.t("vendor_space")}</Text>
              <MenuItem
                icon="package-variant"
                label={i18n.t("my_products")}
                badge={stats.productsCount > 0 ? stats.productsCount : null}
                onPress={() => navigation.navigate("MesProduits")}
              />
              <MenuItem
                icon="plus-circle"
                label={i18n.t("add_product")}
                onPress={() => navigation.navigate("CreateProduct")}
              />
              <MenuItem
                icon="shopping"
                label={i18n.t("my_sales")}
                badge={stats.ordersCount > 0 ? stats.ordersCount : null}
                onPress={() => navigation.navigate("MesVentes")}
              />
              <MenuItem
                icon="file-document"
                label={i18n.t("my_invoices")}
                onPress={() => navigation.navigate("MesFactures")}
                hideBorder
              />
            </View>
          </>
        )}

        {/* SECTION MARKETPLACE PRO LEGACY */}
        {isProfessional && !isPrestataire() && !isVendeur() && (
          <View style={styles.marketplaceSection}>
            <Text style={styles.sectionTitle}>{i18n.t("services")}</Text>
            
            {activityType === "service_provider" && (
              <>
                <MenuItem
                  icon="briefcase"
                  label={i18n.t("my_leads")}
                  badge={stats.leadsCount > 0 ? stats.leadsCount : null}
                  onPress={() => navigation.navigate("MesLeads")}
                />
                <MenuItem
                  icon="file-document"
                  label={i18n.t("my_invoices")}
                  onPress={() => navigation.navigate("MesFactures")}
                  hideBorder
                />
              </>
            )}
            
            {activityType === "seller" && (
              <>
                <MenuItem
                  icon="package-variant"
                  label={i18n.t("my_products")}
                  badge={stats.productsCount > 0 ? stats.productsCount : null}
                  onPress={() => navigation.navigate("MesProduits")}
                />
                <MenuItem
                  icon="shopping"
                  label={i18n.t("my_sales")}
                  badge={stats.ordersCount > 0 ? stats.ordersCount : null}
                  onPress={() => navigation.navigate("MesVentes")}
                />
                <MenuItem
                  icon="file-document"
                  label={i18n.t("my_invoices")}
                  onPress={() => navigation.navigate("MesFactures")}
                  hideBorder
                />
              </>
            )}
          </View>
        )}

        {/* SECTION MES DEMANDES DE SERVICES */}
        <View style={styles.myServicesSection}>
          <Text style={styles.sectionTitle}>{i18n.t("services")}</Text>
          <MenuItem
            icon="star"
            label={i18n.t("my_services")}
            badge={stats.myLeadsCount > 0 ? stats.myLeadsCount : null}
            onPress={() => navigation.navigate("MyLeads")}
            hideBorder
          />
        </View>

        {/* SECTION MES ACHATS */}
        {stats.purchasesCount > 0 && (
          <View style={styles.purchasesSection}>
            <Text style={styles.sectionTitle}>{i18n.t("my_purchases")}</Text>
            <MenuItem
              icon="receipt-text"
              label={i18n.t("my_purchases")}
              badge={stats.purchasesCount > 0 ? stats.purchasesCount : null}
              onPress={() => navigation.navigate("MesFacturesAchat")}
              hideBorder
            />
          </View>
        )}

        {/* MENU ACTIONS */}
        <View style={styles.menu}>
          <MenuItem
            icon="account-edit"
            label={i18n.t("edit_profile")}
            onPress={() => navigation.navigate("Profile")}
          />
          <MenuItem 
            icon="cog" 
            label={i18n.t("settings")} 
            onPress={() => navigation.navigate("Settings")} 
          />
          <MenuItem 
            icon="translate" 
            label={i18n.t("language")} 
            onPress={() => navigation.navigate("LanguageSettings")} 
          />
          <MenuItem 
            icon="help-circle" 
            label={i18n.t("help_center")} 
            onPress={() => navigation.navigate("HelpCenter")} 
          />
          <MenuItem 
            icon="email" 
            label={i18n.t("support")} 
            onPress={() => navigation.navigate("Support")} 
          />
          <MenuItem 
            icon="account-multiple-plus" 
            label={i18n.t("invite_friends")} 
            onPress={() => navigation.navigate("InviteFriends")} 
            hideBorder
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function MenuItem({ icon, label, onPress, badge, hideBorder }) {
  return (
    <View>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuLeft}>
          <MaterialCommunityIcons name={icon} size={24} color="#FF6B35" />
          <Text style={styles.menuText}>{label}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      {!hideBorder && <View style={styles.separator} />}
    </View>
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
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 16,
  },
  createButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 12,
    borderWidth: 4,
    borderColor: "#FF6B35",
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 4,
    borderColor: "#FF6B35",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1976D2",
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
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
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  featuredGradient: {
    padding: 10,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  featuredBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  featuredMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 2,
  },
  featuredSubtitle: {
    color: "#FFF",
    fontSize: 16,
    opacity: 0.95,
    fontWeight: "500",
    marginBottom: 3,
  },
  featuredPrice: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  featuredButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  featuredButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  featuredButtonText: {
    color: "#7B1FA2",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  proBoostCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  proBoostGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  proBoostContent: {
    flex: 1,
  },
  proBoostTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  proBoostSubtitle: {
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
  proBoostPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
  },
  subscriptionBanner: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  subscriptionBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 10,
  },
  dashboardSection: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  marketplaceSection: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  myServicesSection: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  purchasesSection: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menu: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 52,
  },
});