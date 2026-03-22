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
import ScreenLayout from "../../../components/ScreenLayout";
import { useCart } from "../../../contexts/CartContext";

export default function Cart({ navigation }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <ScreenLayout title="Panier" navigation={navigation} showBack>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-off" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>
            Ajoutez des produits depuis la boutique
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("BoutiqueHome")}
          >
            <Text style={styles.emptyButtonText}>Découvrir la boutique</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Panier" navigation={navigation} showBack>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {cartItems.length} article{cartItems.length > 1 ? "s" : ""}
            </Text>
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearText}>Vider le panier</Text>
            </TouchableOpacity>
          </View>

          {/* LISTE PRODUITS */}
          <View style={styles.itemsList}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                {/* PHOTO */}
                <TouchableOpacity
                  onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                >
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="image-off" size={30} color="#9CA3AF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* INFO */}
                <View style={styles.itemInfo}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                  >
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>

                  {item.brand && (
                    <Text style={styles.itemBrand}>{item.brand}</Text>
                  )}

                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemPrice}>₪{item.price.toFixed(0)}</Text>
                    <Text style={styles.itemStock}>
                      {item.stock > 5 ? "En stock" : `Plus que ${item.stock}`}
                    </Text>
                  </View>

                  {/* QUANTITÉ */}
                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <MaterialCommunityIcons name="minus" size={18} color="#003366" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color="#003366" />
                    </TouchableOpacity>

                    {/* SUPPRIMER */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* SOUS-TOTAL LIGNE */}
                  <Text style={styles.itemSubtotal}>
                    Sous-total : ₪{(item.price * item.quantity).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* RÉSUMÉ */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Résumé de la commande</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>₪{getTotal().toFixed(0)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Livraison</Text>
              <Text style={styles.summaryFree}>GRATUITE</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>₪{getTotal().toFixed(0)}</Text>
            </View>
          </View>

        </ScrollView>

        {/* BOUTON COMMANDER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.checkoutButtonContainer}
            onPress={() => navigation.navigate("Checkout")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF9900", "#FFB84D"]}
              style={styles.checkoutButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="cart-check" size={22} color="#FFF" />
              <Text style={styles.checkoutButtonText}>
                Commander · ₪{getTotal().toFixed(0)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 120,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003366",
  },
  clearText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  itemsList: {
    padding: 12,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  itemStock: {
    fontSize: 12,
    color: "#43A047",
    fontWeight: "600",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    minWidth: 30,
    textAlign: "center",
  },
  deleteButton: {
    marginLeft: "auto",
    padding: 6,
  },
  itemSubtotal: {
    fontSize: 13,
    color: "#6B7280",
  },
  summary: {
    backgroundColor: "#FFF",
    margin: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  summaryFree: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#43A047",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
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
  checkoutButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});