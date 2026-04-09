import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import i18n from "../../../utils/i18n";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;
const PEEK_WIDTH = 28;

export default function ServicesHome({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const services = [
    {
      id: 1,
      category: "veterinaire",
      name: i18n.t("veterinarian"),
      icon: "medical-bag",
      description: i18n.t("care_consultations"),
      gradient: ["#1565C0", "#1976D2", "#42A5F5"],
    },
    {
      id: 2,
      category: "toiletteur",
      name: i18n.t("groomer"),
      icon: "content-cut",
      description: i18n.t("professional_grooming"),
      gradient: ["#7B1FA2", "#8E24AA", "#AB47BC"],
    },
    {
      id: 3,
      category: "dogwalker",
      name: i18n.t("dog_walker_boarding"),
      icon: "walk",
      description: i18n.t("walking_boarding"),
      gradient: ["#00796B", "#00897B", "#26A69A"],
    },
    {
      id: 4,
      category: "educateur",
      name: i18n.t("trainer_educator"),
      icon: "whistle",
      description: i18n.t("training_behavior"),
      gradient: ["#388E3C", "#43A047", "#66BB6A"],
    },
    {
      id: 5,
      category: "pension",
      name: i18n.t("dog_boarding"),
      icon: "home-heart",
      description: i18n.t("long_term_care"),
      gradient: ["#F57C00", "#FB8C00", "#FFA726"],
    },
    {
      id: 6,
      category: "transport",
      name: i18n.t("dog_transport"),
      icon: "taxi",
      description: i18n.t("taxi_specialized_transport"),
      gradient: ["#C2185B", "#D81B60", "#EC407A"],
    },
    {
      id: 7,
      category: "photographe",
      name: i18n.t("animal_photographer"),
      icon: "camera",
      description: i18n.t("professional_shooting"),
      gradient: ["#E64A19", "#F4511E", "#FF7043"],
    },
  ];

  const openDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setDrawerOpen(false);
  };

  const toggleDrawer = () => {
    if (drawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  const handleServicePress = (service) => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("ServicesList", { 
        category: service.category,
        categoryName: service.name 
      });
    }, 200);
  };

  const handleAllServicesPress = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("ServicesList", { 
        category: "all",
        categoryName: i18n.t("all_services") 
      });
    }, 200);
  };

  const drawerTranslateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!drawerOpen && gestureState.dx > 0) {
          const value = Math.min(gestureState.dx / DRAWER_WIDTH, 1);
          drawerAnim.setValue(value);
        } else if (drawerOpen && gestureState.dx < 0) {
          const value = Math.max(1 + gestureState.dx / DRAWER_WIDTH, 0);
          drawerAnim.setValue(value);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!drawerOpen && gestureState.dx > 50) {
          openDrawer();
        } else if (drawerOpen && gestureState.dx < -50) {
          closeDrawer();
        } else {
          if (drawerOpen) {
            openDrawer();
          } else {
            closeDrawer();
          }
        }
      },
    })
  ).current;

  const CATEGORY_HEIGHT = 52;
  const CATEGORY_GAP = 8;
  const DRAWER_HEADER_HEIGHT = 50;

  return (
    <ScreenLayout title={i18n.t("services")} navigation={navigation} showBack>
      <View style={styles.mainContainer}>
        
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={toggleDrawer}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name={drawerOpen ? "close" : "menu"} 
            size={20} 
            color="#FFF" 
          />
          <Text style={styles.categoryButtonText}>{i18n.t("services")}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <Image 
              source={require("../../../assets/logo_service.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerSubtitle}>
              {i18n.t("select_service_needed")}
            </Text>
          </View>

          <View style={styles.boostSection}>
            <LinearGradient
              colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
              style={styles.boostGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.boostContent}>
                <MaterialCommunityIcons name="rocket-launch" size={40} color="#FFF" />
                <View style={styles.boostText}>
                  <Text style={styles.boostTitle}>🚀 {i18n.t("boost_visibility")}</Text>
                  <Text style={styles.boostDescription}>
                    {i18n.t("appear_top_results")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.boostButton}
                onPress={() => navigation.navigate("Abonnements")}
              >
                <Text style={styles.boostButtonText}>{i18n.t("discover_boosts")}</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#E91E63" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="account-star" size={24} color="#1976D2" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{i18n.t("are_you_provider")}</Text>
              <Text style={styles.infoText}>
                {i18n.t("register_receive_requests")}
              </Text>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => navigation.navigate("InscriptionPro")}
              >
                <Text style={styles.infoButtonText}>{i18n.t("become_provider")} →</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

        <View style={styles.peekStripFixed}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.peekItem,
                { top: 120 + DRAWER_HEADER_HEIGHT + index * (CATEGORY_HEIGHT + CATEGORY_GAP) }
              ]}
              onPress={openDrawer}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={service.gradient}
                style={styles.peekGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.peekItem, styles.peekItemBottom]}
            onPress={openDrawer}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#003366", "#004080", "#0055A5"]}
              style={styles.peekGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.drawer,
            { transform: [{ translateX: drawerTranslateX }] }
          ]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
            style={styles.drawerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={[styles.drawerHeader, { height: DRAWER_HEADER_HEIGHT }]}>
              <Text style={styles.drawerTitle}>{i18n.t("services")}</Text>
              <TouchableOpacity onPress={closeDrawer}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.drawerItem, { height: CATEGORY_HEIGHT, marginBottom: CATEGORY_GAP }]}
                  activeOpacity={0.8}
                  onPress={() => handleServicePress(service)}
                >
                  <LinearGradient
                    colors={service.gradient}
                    style={styles.drawerItemGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name={service.icon} size={22} color="#FFF" />
                    <View style={styles.drawerItemText}>
                      <Text style={styles.drawerItemName}>{service.name}</Text>
                      <Text style={styles.drawerItemDesc}>{service.description}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.allProductsContainer}>
              <TouchableOpacity
                style={[styles.drawerItem, { height: CATEGORY_HEIGHT }]}
                activeOpacity={0.8}
                onPress={handleAllServicesPress}
              >
                <LinearGradient
                  colors={["#003366", "#004080", "#0055A5"]}
                  style={styles.drawerItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="view-grid" size={22} color="#FFF" />
                  <View style={styles.drawerItemText}>
                    <Text style={styles.drawerItemName}>{i18n.t("all_services")}</Text>
                    <Text style={styles.drawerItemDesc}>{i18n.t("browse_all_providers")}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {drawerOpen && (
          <TouchableOpacity 
            style={styles.overlay}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  categoryButton: {
    position: "absolute",
    top: 10,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976D2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFF",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  logoImage: {
    width: 280,
    height: 80,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  boostSection: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  boostGradient: {
    padding: 20,
  },
  boostContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  boostText: {
    flex: 1,
    marginLeft: 16,
  },
  boostTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  boostDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  boostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  boostButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#E91E63",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#1976D2",
    lineHeight: 18,
    marginBottom: 8,
  },
  infoButton: {
    alignSelf: "flex-start",
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1976D2",
  },
  peekStripFixed: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: PEEK_WIDTH,
    zIndex: 100,
  },
  peekItem: {
    position: "absolute",
    left: 0,
    width: PEEK_WIDTH,
    height: 52,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  peekItemBottom: {
    top: "auto",
    bottom: 20,
  },
  peekGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 120,
    bottom: 10,
    width: DRAWER_WIDTH,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
    zIndex: 200,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerGradient: {
    flex: 1,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  categoriesContainer: {
    flex: 1,
    paddingTop: 12,
  },
  drawerItem: {
    borderRadius: 12,
    overflow: "hidden",
  },
  drawerItemGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  drawerItemText: {
    flex: 1,
  },
  drawerItemName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  drawerItemDesc: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
  },
  allProductsContainer: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 150,
  },
});