import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";

// PALETTE CORRIGÉE
const Colors = {
  primaryStart: '#42A5F5',
  primaryEnd: '#1976D2',
  secondaryStart: '#FF6B35',
  secondaryEnd: '#E85D2A',
  successStart: '#06D6A0',
  successEnd: '#059669',
  backgroundGradientStart: '#F5D547', // Jaune
  backgroundGradientEnd: '#FF9966', // Orange
  card: '#F5F5F7', // Gris clair pour cartes
  cardSection: '#ECECEE',
  textPrimary: '#1A1A1D',
  textSecondary: '#6B7280',
};

export default function StylePreview({ navigation }) {
  return (
    <ScreenLayout
      title="🎨 Aperçu V3 - Corrigé"
      navigation={navigation}
      showBack={true}
    >
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* PALETTE DE COULEURS */}
          <Text style={styles.sectionTitle}>🎨 Dégradés CupiDog</Text>
          <View style={styles.colorGrid}>
            <View style={styles.colorBox}>
              <LinearGradient
                colors={[Colors.successStart, Colors.successEnd]}
                style={styles.colorSample}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.colorLabel}>Vert WhatsApp</Text>
              <Text style={styles.colorCode}>Contacter</Text>
            </View>
            <View style={styles.colorBox}>
              <LinearGradient
                colors={[Colors.secondaryStart, Colors.secondaryEnd]}
                style={styles.colorSample}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.colorLabel}>Orange</Text>
              <Text style={styles.colorCode}>Like</Text>
            </View>
            <View style={styles.colorBox}>
              <LinearGradient
                colors={[Colors.primaryStart, Colors.primaryEnd]}
                style={styles.colorSample}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.colorLabel}>Bleu</Text>
              <Text style={styles.colorCode}>Autres</Text>
            </View>
          </View>

          {/* TYPOGRAPHIE */}
          <Text style={styles.sectionTitle}>📝 Typographie GRASSE & LISIBLE</Text>
          <View style={styles.typeBox}>
            <Text style={styles.typeTitle}>Titre - 26px Bold</Text>
            <Text style={styles.typeSubtitle}>Sous-titre - 18px SemiBold</Text>
            <Text style={styles.typeBody}>Corps de texte - 16px Regular - Lorem ipsum dolor sit amet</Text>
            <Text style={styles.typeCaption}>Caption - 14px Medium</Text>
          </View>

          {/* CARTE CHIEN - NOUVEAU DESIGN V3 */}
          <Text style={styles.sectionTitle}>🐕 Carte Chien V3 - CORRIGÉ</Text>
          <View style={styles.dogCardNew}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400' }}
              style={styles.dogImageNew}
            />
            
            {/* BADGES SOUS PHOTO */}
            <View style={styles.badgesContainer}>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#06D6A0" />
                <Text style={styles.badgeText}>Vérifié</Text>
              </View>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="star" size={14} color="#FFB84D" />
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            </View>

            {/* INFOS AVEC ICÔNES */}
            <View style={styles.dogInfoNew}>
              <Text style={styles.dogNameNew}>Max</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="dog" size={18} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Husky Sibérien</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cake-variant" size={18} color={Colors.textSecondary} />
                <Text style={styles.infoText}>2 ans</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="heart-outline" size={18} color={Colors.secondaryStart} />
                <Text style={styles.infoPurpose}>Saillie</Text>
              </View>
            </View>

            {/* BOUTONS : LIKE (OUTLINE ORANGE) + CONTACTER (VERT) */}
            <View style={styles.dogActionsNew}>
              <TouchableOpacity style={styles.likeButtonOutline}>
                <MaterialCommunityIcons name="heart-outline" size={22} color={Colors.secondaryStart} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.chatButtonContainer}>
                <LinearGradient
                  colors={[Colors.successStart, Colors.successEnd]}
                  style={styles.chatButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="whatsapp" size={18} color="#FFF" />
                  <Text style={styles.chatTextNew}>Contacter</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* CARTE CHIEN - ANCIEN DESIGN */}
          <Text style={styles.sectionTitle}>🐕 AVANT - Design Actuel</Text>
          <View style={styles.dogCardOld}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400' }}
              style={styles.dogImageOld}
            />
            <View style={styles.dogInfoOld}>
              <Text style={styles.dogNameOld}>Max</Text>
              <Text style={styles.dogDetailOld}>Husky Sibérien • 2 ans</Text>
              <Text style={styles.dogDetailOld}>Saillie</Text>
            </View>
            <View style={styles.dogActionsOld}>
              <TouchableOpacity style={styles.likeButtonOld}>
                <Text style={styles.likeTextOld}>❤️ Liker</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatButtonOld}>
                <Text style={styles.chatTextOld}>💬 Contacter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BOUTONS AVEC DÉGRADÉS */}
          <Text style={styles.sectionTitle}>🔘 Nouveaux Boutons</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity>
              <LinearGradient
                colors={[Colors.successStart, Colors.successEnd]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Contacter (Vert WhatsApp)</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity>
              <LinearGradient
                colors={[Colors.secondaryStart, Colors.secondaryEnd]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Bouton Orange</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity>
              <LinearGradient
                colors={[Colors.primaryStart, Colors.primaryEnd]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Bouton Bleu</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* PROMO ABO */}
          <Text style={styles.sectionTitle}>💎 Promo Abo</Text>
          <TouchableOpacity>
            <LinearGradient
              colors={['#FF1493', '#8B5CF6']}
              style={styles.promoCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.promoTitle}>CupiDog Premium 🐕</Text>
              <Text style={styles.promoSubtitle}>Jusqu'à 10 chiens + Boost mensuel</Text>
              <View style={styles.promoCTA}>
                <Text style={styles.promoCTAText}>Je m'abonne →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* AVIS CHEF DESIGN */}
          <LinearGradient
            colors={[Colors.successStart, Colors.successEnd]}
            style={styles.feedbackBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.feedbackTitle}>💬 Verdict Chef Design V3 ?</Text>
            <Text style={styles.feedbackText}>
              ✅ Validé ou ❌ À revoir ?
            </Text>
          </LinearGradient>

        </ScrollView>
      </LinearGradient>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 24,
    marginBottom: 12,
  },
  
  // PALETTE COULEURS
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorBox: {
    width: "31%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 12,
  },
  colorSample: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "center",
  },
  colorCode: {
    fontSize: 11,
    color: "#FFF",
    opacity: 0.8,
    textAlign: "center",
  },

  // TYPOGRAPHIE
  typeBox: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
  },
  typeTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  typeSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  typeBody: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  typeCaption: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },

  // CARTE CHIEN NOUVEAU (GRIS CLAIR)
  dogCardNew: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  dogImageNew: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  dogInfoNew: {
    marginBottom: 16,
  },
  dogNameNew: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  infoPurpose: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.secondaryStart,
  },
  dogActionsNew: {
    flexDirection: "row",
    gap: 12,
  },
  likeButtonOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.secondaryStart,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  chatButtonContainer: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  chatButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatTextNew: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 17,
  },

  // CARTE CHIEN ANCIEN
  dogCardOld: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
  },
  dogImageOld: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  dogInfoOld: {
    marginBottom: 12,
  },
  dogNameOld: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  dogDetailOld: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
  dogActionsOld: {
    gap: 8,
  },
  likeButtonOld: {
    backgroundColor: "#ff914d",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  likeTextOld: {
    color: "#FFF",
    fontWeight: "bold",
  },
  chatButtonOld: {
    backgroundColor: "#42A5F5",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  chatTextOld: {
    color: "#FFF",
    fontWeight: "bold",
  },

  // BOUTONS DÉGRADÉS
  buttonsContainer: {
    gap: 12,
  },
  buttonGradient: {
    padding: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // PROMO ABO
  promoCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 15,
    color: "#FFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  promoCTA: {
    backgroundColor: "rgba(255,255,255,0.25)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  promoCTAText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // FEEDBACK
  feedbackBox: {
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 40,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 15,
    color: "#FFF",
  },
});