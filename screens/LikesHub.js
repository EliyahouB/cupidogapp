import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenLayout from "../components/ScreenLayout";
import MesMatchs from "./MesMatchs";
import Favoris from "./Favoris";

const { width } = Dimensions.get("window");

export default function LikesHub({ navigation }) {
  const [activeTab, setActiveTab] = useState("recu");

  return (
    <ScreenLayout title="Likes" navigation={navigation} active="likes">
      {/* ONGLETS EN HAUT */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "recu" && styles.tabActive]}
          onPress={() => setActiveTab("recu")}
        >
          <Text style={[styles.tabText, activeTab === "recu" && styles.tabTextActive]}>
            Likes reçus
          </Text>
          {activeTab === "recu" && (
            <LinearGradient
              colors={['#FF6B35', '#E85D2A']}
              style={styles.tabIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "favoris" && styles.tabActive]}
          onPress={() => setActiveTab("favoris")}
        >
          <Text style={[styles.tabText, activeTab === "favoris" && styles.tabTextActive]}>
            Mes favoris
          </Text>
          {activeTab === "favoris" && (
            <LinearGradient
              colors={['#FF6B35', '#E85D2A']}
              style={styles.tabIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENU SELON ONGLET */}
      <View style={styles.content}>
        {activeTab === "recu" ? (
          <MesMatchs navigation={navigation} embedded={true} />
        ) : (
          <Favoris navigation={navigation} embedded={true} />
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#1A1A1D",
    fontWeight: "bold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
});