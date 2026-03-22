import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../components/ScreenLayout";

export default function MarketplaceHome({ navigation }) {
  return (
    <ScreenLayout title="Marketplace" navigation={navigation} active="marketplace">
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Image 
            source={require("../../assets/logo_shop.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerSubtitle}>
            Services professionnels et produits pour votre chien
          </Text>
        </View>

        {/* SECTION SERVICES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Professionnels</Text>
          <TouchableOpacity
            style={styles.bigCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("ServicesHome")}
          >
            <LinearGradient
              colors={["#0D47A1", "#1976D2", "#42A5F5"]}
              style={styles.bigCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image 
                source={require("../../assets/service_cupidog.png")}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <View style={styles.cardContent}>
                <Text style={styles.bigCardTitle}>Trouver un professionnel</Text>
                <Text style={styles.bigCardSubtitle}>
                  Vétérinaire • Toiletteur • Dog-walker • Éducateur • Pension
                </Text>
              </View>
              <View style={styles.bigCardArrow}>
                <MaterialCommunityIcons name="chevron-right" size={28} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* SECTION BOUTIQUE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boutique</Text>
          <TouchableOpacity
            style={styles.bigCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("BoutiqueHome")}
          >
            <LinearGradient
              colors={["#00796B", "#00897B", "#26A69A"]}
              style={styles.bigCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image 
                source={require("../../assets/boutique_cupidog.png")}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <View style={styles.cardContent}>
                <Text style={styles.bigCardTitle}>Acheter des produits</Text>
                <Text style={styles.bigCardSubtitle}>
                  Croquettes • Jouets • Accessoires • Hygiène
                </Text>
              </View>
              <View style={styles.bigCardArrow}>
                <MaterialCommunityIcons name="chevron-right" size={28} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={24} color="#1976D2" />
          <Text style={styles.infoText}>
            Vous êtes prestataire ou vendeur ? Inscrivez-vous pour proposer vos services ou produits !
          </Text>
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  logoImage: {
    width: 300,
    height: 180,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 10,
  },
  bigCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bigCardGradient: {
    padding: 16,
    minHeight: 140,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  cardImage: {
    width: 100,
    height: 100,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    paddingRight: 50,
  },
  bigCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 6,
  },
  bigCardSubtitle: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.95,
    lineHeight: 16,
  },
  bigCardArrow: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
});