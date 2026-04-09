import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth, db } from "../../../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import i18n from "../../../utils/i18n";

export default function MesVentes({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const loadOrders = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const ordersQuery = collection(db, "marketplace_orders");
      const ordersSnap = await getDocs(ordersQuery);
      
      const myOrders = [];
      ordersSnap.forEach(doc => {
        const order = doc.data();
        if (order.items && Array.isArray(order.items)) {
          const myItems = order.items.filter(item => item.sellerId === user.uid);
          if (myItems.length > 0) {
            myOrders.push({
              id: doc.id,
              ...order,
              myItems,
            });
          }
        }
      });

      setOrders(myOrders);
    } catch (error) {
      console.error("Erreur loadOrders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getFilteredOrders = () => {
    if (filter === "all") return orders;
    return orders.filter(order => order.status === filter);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#FF9900",
      processing: "#1976D2",
      shipped: "#9C27B0",
      delivered: "#43A047",
      cancelled: "#DC2626",
    };
    return colors[status] || "#6B7280";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: i18n.t("pending"),
      processing: i18n.t("processing"),
      shipped: i18n.t("shipped"),
      delivered: i18n.t("delivered"),
      cancelled: i18n.t("cancelled"),
    };
    return labels[status] || status;
  };

  const getStatusCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
    };
  };

  const getTotalRevenue = () => {
    return orders.reduce((sum, order) => {
      const myRevenue = order.myItems.reduce((itemSum, item) => 
        itemSum + (item.sellerPayout * item.quantity), 0
      );
      return sum + myRevenue;
    }, 0);
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_sales")} navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      </ScreenLayout>
    );
  }

  const filteredOrders = getFilteredOrders();
  const counts = getStatusCounts();
  const totalRevenue = getTotalRevenue();

  return (
    <ScreenLayout title={i18n.t("my_sales")} navigation={navigation} showBack>
      <View style={styles.container}>
        <View style={styles.statsHeader}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="shopping" size={24} color="#E91E63" />
            <Text style={styles.statValue}>{counts.all}</Text>
            <Text style={styles.statLabel}>{i18n.t("orders")}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9900" />
            <Text style={styles.statValue}>{counts.pending}</Text>
            <Text style={styles.statLabel}>{i18n.t("pending")}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#43A047" />
            <Text style={styles.statValue}>{counts.delivered}</Text>
            <Text style={styles.statLabel}>{i18n.t("delivered")}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#43A047" />
            <Text style={styles.statValue}>₪{totalRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>{i18n.t("total")}</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
              onPress={() => setFilter("all")}
            >
              <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                {i18n.t("all")} ({counts.all})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "pending" && styles.filterChipActive]}
              onPress={() => setFilter("pending")}
            >
              <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>
                {i18n.t("pending")} ({counts.pending})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "shipped" && styles.filterChipActive]}
              onPress={() => setFilter("shipped")}
            >
              <Text style={[styles.filterText, filter === "shipped" && styles.filterTextActive]}>
                {i18n.t("shipped")} ({counts.shipped})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "delivered" && styles.filterChipActive]}
              onPress={() => setFilter("delivered")}
            >
              <Text style={[styles.filterText, filter === "delivered" && styles.filterTextActive]}>
                {i18n.t("delivered")} ({counts.delivered})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="shopping-outline" size={80} color="#9CA3AF" />
              <Text style={styles.emptyText}>{i18n.t("no_sales")}</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {filteredOrders.map((order) => {
                const myRevenue = order.myItems.reduce((sum, item) => 
                  sum + (item.sellerPayout * item.quantity), 0
                );

                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <MaterialCommunityIcons name="cart" size={20} color="#E91E63" />
                        <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Text style={styles.statusBadgeText}>{getStatusLabel(order.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.customerSection}>
                      <View style={styles.customerRow}>
                        <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
                        <Text style={styles.customerText}>{order.customerName}</Text>
                      </View>
                      <View style={styles.customerRow}>
                        <MaterialCommunityIcons name="phone" size={16} color="#6B7280" />
                        <Text style={styles.customerText}>{order.customerPhone}</Text>
                      </View>
                    </View>

                    <View style={styles.itemsSection}>
                      <Text style={styles.itemsLabel}>{i18n.t("my_products_in_order")} :</Text>
                      {order.myItems.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Text style={styles.itemName}>{item.productName}</Text>
                          <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                          <Text style={styles.itemPrice}>₪{(item.sellerPayout * item.quantity).toFixed(0)}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.totalSection}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{i18n.t("you_receive")} :</Text>
                        <Text style={styles.totalValue}>₪{myRevenue.toFixed(0)}</Text>
                      </View>
                      <Text style={styles.totalNote}>
                        ({i18n.t("cupidog_commission")} : ₪{(order.myItems.reduce((sum, item) => 
                          sum + (item.commission * item.quantity), 0
                        )).toFixed(0)})
                      </Text>
                    </View>

                    <View style={styles.dateSection}>
                      <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {order.createdAt?.toDate?.()?.toLocaleDateString(getLocale()) || i18n.t("unknown_date")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
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
  filters: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#E91E63",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFF",
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
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
  },
  customerSection: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerText: {
    fontSize: 14,
    color: "#003366",
  },
  itemsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: "#003366",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6B7280",
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E91E63",
  },
  totalSection: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#43A047",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#43A047",
  },
  totalNote: {
    fontSize: 11,
    color: "#43A047",
    marginTop: 4,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
});