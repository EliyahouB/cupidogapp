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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useCart } from "../../../contexts/CartContext";

const { width } = Dimensions.get("window");

export default function ProductDetails({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const docRef = doc(db, "marketplace_products", productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Erreur loadProduct:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryGradient = () => {
    const gradients = {
      nourriture: ["#0D47A1", "#1976D2", "#42A5F5"],
      jouets: ["#2E7D32", "#43A047", "#66BB6A"],
      accessoires: ["#6A1B9A", "#8E24AA", "#AB47BC"],
      hygiene: ["#E65100", "#F57C00", "#FFA726"],
    };
    return gradients[product?.category] || ["#E91E63", "#F06292"];
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart(product, quantity);
    
    Alert.alert(
      "Ajouté au panier ! 🛒",
      `${quantity} × ${product.name}`,
      [
        { text: "Continuer", style: "cancel" },
        { text: "Voir le panier", onPress: () => navigation.navigate("Cart") }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout title="Chargement..." navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      </ScreenLayout>
    );
  }

  if (!product) {
    return (
      <ScreenLayout title="Erreur" navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="alert-circle" size={80} color="#9CA3AF" />
          <Text style={styles.emptyText}>Produit introuvable</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={product.name} navigation={navigation} showBack showCart>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* PHOTOS SLIDER */}
        <View style={styles.photosSection}>
          {product.photos && product.photos.length > 0 ? (
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
                {product.photos.map((photo, idx) => (
                  <Image key={idx} source={{ uri: photo }} style={styles.photo} />
                ))}
              </ScrollView>
              
              {product.photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {product.photos.map((_, idx) => (
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

          {/* BADGE RUPTURE */}
          {product.stock === 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>Rupture de stock</Text>
            </View>
          )}
        </View>

        {/* HEADER INFO */}
        <View style={styles.header}>
          <Text style={styles.productName}>{product.name}</Text>

          {product.brand && (
            <Text style={styles.brandText}>{product.brand}</Text>
          )}

          {/* RATING */}
          {product.rating > 0 && (
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              {product.reviewsCount > 0 && (
                <Text style={styles.reviewsCount}>({product.reviewsCount} avis)</Text>
              )}
            </View>
          )}

          {/* PRIX */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{product.price}₪</Text>
            {product.stock > 0 && (
              <Text style={styles.stockText}>En stock : {product.stock}</Text>
            )}
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* CARACTÉRISTIQUES */}
        {(product.weight || product.brand) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caractéristiques</Text>
            {product.brand && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marque :</Text>
                <Text style={styles.infoValue}>{product.brand}</Text>
              </View>
            )}
            {product.weight && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Poids :</Text>
                <Text style={styles.infoValue}>{product.weight}</Text>
              </View>
            )}
          </View>
        )}

        {/* VENDEUR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendeur</Text>
          <View style={styles.sellerCard}>
            <MaterialCommunityIcons name="store" size={24} color="#E91E63" />
            <Text style={styles.sellerName}>{product.sellerName}</Text>
          </View>
        </View>

        {/* QUANTITÉ */}
        {product.stock > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantité</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#003366" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#003366" />
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* BOUTON AJOUTER AU PANIER */}
      {product.stock > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>Total</Text>
            <Text style={styles.footerPriceValue}>{product.price * quantity}₪</Text>
          </View>
          <TouchableOpacity
            style={styles.addToCartButtonContainer}
            onPress={handleAddToCart}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={getCategoryGradient()}
              style={styles.addToCartButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="cart-plus" size={22} color="#FFF" />
              <Text style={styles.addToCartButtonText}>Ajouter au panier</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 120,
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
    height: 300,
    backgroundColor: "#E5E7EB",
  },
  photoPlaceholder: {
    width: width,
    height: 300,
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
  stockBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  productName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 8,
  },
  brandText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
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
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#E91E63",
  },
  stockText: {
    fontSize: 13,
    color: "#43A047",
    fontWeight: "600",
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
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    flex: 1,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE4EC",
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E91E63",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    minWidth: 40,
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
  footerPrice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  footerPriceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  footerPriceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
  },
  addToCartButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});