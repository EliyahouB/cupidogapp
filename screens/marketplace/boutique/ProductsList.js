import React, { useEffect, useState } from "react";
import { useCart } from "../../../contexts/CartContext";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { getProductsByCategory, getAllProducts } from "../../../utils/marketplace";
import { auth, db } from "../../../config/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function ProductsList({ route, navigation }) {
  const { category, categoryName } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfessional, setIsProfessional] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProducts();
    checkProfessionalStatus();
  }, []);

  const loadProducts = async () => {
    console.log("=== loadProducts ===");
    console.log("category reçu:", category);
    console.log("category === 'all':", category === "all");
    
    setLoading(true);
    let data;
    
    if (category === "all" || !category) {
      console.log("→ Appel getAllProducts");
      data = await getAllProducts();
    } else {
      console.log("→ Appel getProductsByCategory avec:", category);
      data = await getProductsByCategory(category);
    }
    
    console.log("data reçue:", data);
    console.log("nombre de produits:", data ? data.length : 0);
    setProducts(data);
    setLoading(false);
  };

  const checkProfessionalStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const proDoc = await getDoc(doc(db, "professional_accounts", user.uid));
      const hasProfessionalAccount = 
        proDoc.exists() && 
        proDoc.data().status === "approved" && 
        proDoc.data().activityType === "seller";
      
      setIsProfessional(hasProfessionalAccount);
    } catch (error) {
      console.error("Erreur checkProfessionalStatus:", error);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    Alert.alert("Ajouté au panier", `${product.name} a été ajouté au panier`);
  };

  if (loading) {
    return (
      <ScreenLayout title={categoryName} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF9900" />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (products.length === 0) {
    return (
      <ScreenLayout title={categoryName} navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="package-variant-closed" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Aucun produit</Text>
          <Text style={styles.emptyText}>
            {isProfessional 
              ? "Soyez le premier à vendre des produits !"
              : "Aucun produit disponible pour le moment"
            }
          </Text>
          {isProfessional && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CreateProduct")}
            >
              <Text style={styles.emptyButtonText}>Vendre un produit</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScreenLayout title={categoryName} navigation={navigation} showBack showCart>
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerResults}>
              {products.length} résultat{products.length > 1 ? "s" : ""}
            </Text>
            {isProfessional && (
              <TouchableOpacity
                style={styles.sellButton}
                onPress={() => navigation.navigate("CreateProduct")}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#FF9900" />
                <Text style={styles.sellButtonText}>Vendre</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LISTE PRODUITS STYLE AMAZON */}
          <View style={styles.productsList}>
            {products.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                activeOpacity={0.95}
                onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
              >
                {/* PHOTO + BADGES */}
                <View style={styles.photoSection}>
                  {product.photos && product.photos.length > 0 ? (
                    <Image 
                      source={{ uri: product.photos[0] }} 
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="image-off" size={40} color="#D1D5DB" />
                    </View>
                  )}

                  {/* BADGES */}
                  {index === 0 && (
                    <View style={[styles.badge, styles.badgeBestSeller]}>
                      <Text style={styles.badgeText}>Nº1 des ventes</Text>
                    </View>
                  )}
                  {product.featured && (
                    <View style={[styles.badge, styles.badgePromo]}>
                      <Text style={styles.badgeText}>-20%</Text>
                    </View>
                  )}
                  {product.stock > 0 && product.stock < 5 && (
                    <View style={[styles.badge, styles.badgeStock]}>
                      <Text style={styles.badgeText}>Plus que {product.stock}</Text>
                    </View>
                  )}
                </View>

                {/* INFO SECTION */}
                <View style={styles.infoSection}>
                  {/* NOM PRODUIT */}
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  {/* RATING */}
                  {product.rating > 0 && (
                    <View style={styles.ratingRow}>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialCommunityIcons
                            key={star}
                            name={star <= Math.round(product.rating) ? "star" : "star-outline"}
                            size={14}
                            color="#FF9900"
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingValue}>{product.rating.toFixed(1)}</Text>
                      {product.reviewsCount > 0 && (
                        <Text style={styles.reviewsCount}>({product.reviewsCount})</Text>
                      )}
                    </View>
                  )}

                  {/* PRIX */}
                  <View style={styles.priceSection}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceCurrency}>₪</Text>
                      <Text style={styles.priceValue}>{product.price.toFixed(0)}</Text>
                    </View>
                    {product.stock > 0 && (
                      <Text style={styles.deliveryText}>Livraison GRATUITE</Text>
                    )}
                  </View>

                  {/* DESCRIPTION COURTE */}
                  {product.description && (
                    <Text style={styles.shortDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}

                  {/* STOCK */}
                  {product.stock === 0 ? (
                    <Text style={styles.outOfStock}>Temporairement en rupture de stock</Text>
                  ) : (
                    product.stock < 10 && (
                      <Text style={styles.lowStock}>Plus que {product.stock} en stock</Text>
                    )
                  )}

                  {/* VENDEUR */}
                  <View style={styles.sellerRow}>
                    <MaterialCommunityIcons name="store-outline" size={14} color="#6B7280" />
                    <Text style={styles.sellerText}>{product.sellerName}</Text>
                  </View>

                  {/* BOUTON PANIER */}
                  {product.stock > 0 && (
                    <TouchableOpacity
                      style={styles.addToCartButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <MaterialCommunityIcons name="cart-plus" size={18} color="#FFF" />
                      <Text style={styles.addToCartText}>Ajouter au panier</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </ScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
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
    backgroundColor: "#FF9900",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  header: {
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerResults: {
    fontSize: 14,
    color: "#6B7280",
  },
  sellButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3E0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF9900",
  },
  sellButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF9900",
  },
  productsList: {
    padding: 12,
    gap: 12,
  },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoSection: {
    width: 140,
    height: 140,
    padding: 8,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeBestSeller: {
    backgroundColor: "#FF6B35",
  },
  badgePromo: {
    backgroundColor: "#DC2626",
  },
  badgeStock: {
    backgroundColor: "#059669",
    top: 32,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoSection: {
    flex: 1,
    padding: 12,
  },
  productName: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 6,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  stars: {
    flexDirection: "row",
  },
  ratingValue: {
    fontSize: 13,
    color: "#FF9900",
    fontWeight: "600",
  },
  reviewsCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  priceSection: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priceCurrency: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
    marginTop: 2,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  deliveryText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  shortDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  outOfStock: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    marginBottom: 8,
  },
  lowStock: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "600",
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  sellerText: {
    fontSize: 12,
    color: "#6B7280",
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD814",
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F1111",
  },
});