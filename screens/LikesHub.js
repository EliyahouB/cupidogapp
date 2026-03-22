import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenLayout from "../components/ScreenLayout";
import MesMatchs from "./MesMatchs";
import Favoris from "./Favoris";

const { width } = Dimensions.get("window");

export default function LikesHub({ navigation }) {
  const [activeTab, setActiveTab] = useState("favoris");
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab === "recu" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [activeTab]);

  const buttonWidth = (width - 48) / 2;
  const slidePosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, buttonWidth + 16],
  });

  return (
    <ScreenLayout title="Likes" navigation={navigation} active="likes">
      <View style={styles.tabsContainer}>
        <Animated.View
          style={[
            styles.slidingButton,
            {
              width: buttonWidth,
              transform: [{ translateX: slidePosition }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("recu")}
        >
          <Text style={[styles.tabText, activeTab === "recu" && styles.tabTextActive]}>
            Intéressés
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("favoris")}
        >
          <Text style={[styles.tabText, activeTab === "favoris" && styles.tabTextActive]}>
            Mes Favoris
          </Text>
        </TouchableOpacity>
      </View>

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
    borderRadius: 25,
    padding: 8,
    margin: 16,
    position: "relative",
  },
  slidingButton: {
    position: "absolute",
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    top: 8,
    zIndex: 0,
  },
  gradientButton: {
    flex: 1,
    borderRadius: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
});