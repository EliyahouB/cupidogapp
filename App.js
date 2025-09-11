// App.js — CupiDog UI (SDK 53) — final pass

import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_SIZE = Math.min(0.42 * width, 160);
const TOOLBAR_BOTTOM_OFFSET = Platform.OS === "android" ? 10 : 0; // un peu plus bas qu'avant

export default function App() {
  return (
    <LinearGradient
      colors={["#FFD580", "#FF8A80"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF8A80" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>CupiDog</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {/* Mes chiens */}
          <MenuCard
            icon={<MaterialCommunityIcons name="paw" size={48} color="#22B8CF" />}
            label="Mes chiens"
          />

          {/* Rencontre / Parc : 2 personnes + chien */}
          <MenuCard
            icon={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="people" size={32} color="#4C6EF5" />
                <FontAwesome5 name="dog" size={30} color="#4C6EF5" />
              </View>
            }
            label={"Rencontre /\nParc"}
          />

          {/* Éleveur / Saillie : multi-chiens (2 dogs superposés) */}
          <MenuCard
            icon={
              <View style={{ width: 52, height: 40 }}>
                <FontAwesome5
                  name="dog"
                  size={28}
                  color="#22B8CF"
                  style={{ position: "absolute", left: 4, top: 6 }}
                />
                <FontAwesome5
                  name="dog"
                  size={28}
                  color="#22B8CF"
                  style={{ position: "absolute", left: 18, top: 0, opacity: 0.9 }}
                />
              </View>
            }
            label="Éleveur / Saillie"
          />

          {/* Achat / Vente : ta vignette complète, plus grande */}
          <MenuCard
            icon={
              <Image
                source={require("./assets/achat-vente.png")}
                style={{ width: 60, height: 60, borderRadius: 12, resizeMode: "contain" }}
              />
            }
            label={"Achat /\nVente"}
          />
        </View>

        {/* Déconnexion */}
        <View style={styles.logoutRow}>
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={["#64B5F6", "#1976D2", "#0D47A1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutBtn}
            >
              <Text style={styles.logoutText}>Déconnexion</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Toolbar (dégradé bleu) */}
      <LinearGradient
        colors={["#42A5F5", "#1976D2", "#0D47A1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.toolbar, { bottom: TOOLBAR_BOTTOM_OFFSET }]}
      >
        <ToolbarIcon name="home" active />
        <ToolbarIcon name="paw" lib="MaterialCommunityIcons" />
        <ToolbarIcon name="chatbubbles" />
        <ToolbarIcon name="heart" />
      </LinearGradient>
    </LinearGradient>
  );
}

/* ---------- Components ---------- */

function MenuCard({ icon, label }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.cardIcon}>{icon}</View>
        <Text style={styles.cardText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ToolbarIcon({ name, lib = "Ionicons", active = false }) {
  const color = active ? "#FFFFFF" : "#E3F2FD";
  const size = 26;
  if (lib === "MaterialCommunityIcons") {
    return (
      <View style={styles.toolbarItem}>
        <MaterialCommunityIcons name={name} size={size} color={color} />
      </View>
    );
  }
  return (
    <View style={styles.toolbarItem}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  header: { alignItems: "center", paddingVertical: 8 },
  brand: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },

  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  cardShadow: {
    borderRadius: 24,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  cardIcon: { marginBottom: 10 },
  cardText: {
    textAlign: "center",
    color: "#1F2937",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },

  logoutRow: {
    alignItems: "center",
    marginBottom: 88, // au-dessus de la toolbar
  },
  logoutBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  logoutText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 66,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 12,
  },
  toolbarItem: { flex: 1, alignItems: "center" },
});
