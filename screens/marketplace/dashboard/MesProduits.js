import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth, db } from "../../../config/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function MesProduits({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, "marketplace_products"),
        where("sellerId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (error) {
      console.error("Erreur loadProducts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    
    try {
      const productRef = doc(db, "marketplace_products", productId);
      await updateDoc(productRef, { status: newStatus });
      loadProducts();
    } catch (error) {
      console.error("Erreur handleToggleStatus:", error);
      Alert.alert("Erreur", "Impossible de modifier le statut");
    }
  };

  const handleDelete = (productId, productName) => {
    Alert.alert(
      "Supprimer le produit",
      `Êtes-vous sûr de vouloir supprimer "${productName}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "marketplace_products", productId));
              loadProducts();
              Alert.alert("Succès", "Produit supprimé");
            } catch (error) {
              console.error("Erreur handleDelete:", error);
              Alert.alert("Erreur", "Impossible de supprimer le produit");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout title="Mes produits" navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      </ScreenLayout>
    );
  }

  const activeProducts = products.filter(p => p.status === "active");
  const totalSales = products.reduce((sum, p) => sum + (p.sold || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.sold || 0) * 0.8), 0);

  return (
    <ScreenLayout title="Mes produits" navigation={navigation} showBack>
      <View style={styles.container}>
        {/* STATS HEADER */}
        <View style={styles.statsHeader}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#E91E63" />
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#43A047" />
            <Text style={styles.statValue}>{activeProducts.length}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cart-check" size={24} color="#1976D2" />
            <Text style={styles.statValue}>{totalSales}</Text>
            <Text style={styles.statLabel}>Vendus</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cash" size={24} color="#43A047" />
            <Text style={styles.statValue}>₪{totalRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Gains</Text>
          </View>
        </View>

        {/* LISTE */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {products.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="package-variant-closed" size={80} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucun produit en vente</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateProduct")}
              >
                <Text style={styles.emptyButtonText}>Ajouter un produit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productsList}>
              {products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  {/* PHOTO + INFO */}
                  <View style={styles.productMain}>
                    {product.photos && product.photos.length > 0 ? (
                      <Image source={{ uri: product.photos[0] }} style={styles.productImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="image-off" size={30} color="#9CA3AF" />
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <View style={styles.productHeader}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: product.status === "active" ? "#43A047" : "#DC2626" }
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {product.status === "active" ? "Actif" : "Suspendu"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.productDetails}>
                        <View style={styles.detailRow}>
                          <MaterialCommunityIcons name="cash" size={16} color="#E91E63" />
                          <Text style={styles.detailText}>₪{product.price}</Text>
                          <Text style={styles.detailSubtext}>(Tu reçois ₪{(product.price * 0.8).toFixed(0)})</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <MaterialCommunityIcons name="package-variant" size={16} color="#6B7280" />
                          <Text style={styles.detailText}>Stock : {product.stock}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <MaterialCommunityIcons name="cart" size={16} color="#1976D2" />
                          <Text style={styles.detailText}>Vendus : {product.sold || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* ACTIONS */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate("EditProduct", { productId: product.id })}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#1976D2" />
                      <Text style={styles.actionButtonText}>Modifier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleToggleStatus(product.id, product.status)}
                    >
                      <MaterialCommunityIcons 
                        name={product.status === "active" ? "pause-circle" : "play-circle"} 
                        size={18} 
                        color="#FF9900" 
                      />
                      <Text style={styles.actionButtonText}>
                        {product.status === "active" ? "Suspendre" : "Activer"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(product.id, product.name)}
                    >
                      <MaterialCommunityIcons name="delete" size={18} color="#DC2626" />
                      <Text style={styles.actionButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* BOUTON AJOUTER */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate("CreateProduct")}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
      },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsHeader: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#E91E63",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  productsList: {
    gap: 16,
  },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productMain: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#003366",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  productDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#003366",
    fontWeight: "600",
  },
  detailSubtext: {
    fontSize: 11,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#003366",
  },
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});