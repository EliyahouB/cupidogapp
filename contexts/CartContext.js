import React, { createContext, useState, useContext } from "react";
import { Alert } from "react-native";

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product, quantity = 1) => {
    const existingItem = cartItems.find(item => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity + quantity > product.stock) {
        Alert.alert("Stock insuffisant", `Maximum ${product.stock} disponible`);
        return;
      }
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      if (quantity > product.stock) {
        Alert.alert("Stock insuffisant", `Maximum ${product.stock} disponible`);
        return;
      }
      setCartItems([...cartItems, { ...product, quantity }]);
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const item = cartItems.find(i => i.id === productId);
    if (quantity > item.stock) {
      Alert.alert("Stock insuffisant", `Maximum ${item.stock} disponible`);
      return;
    }
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(cartItems.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getItemsCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};