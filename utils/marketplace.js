import { db } from "../config/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  serverTimestamp 
} from "firebase/firestore";

// ========================================
// SERVICES
// ========================================

export const createService = async (serviceData) => {
  try {
    const docRef = await addDoc(collection(db, "marketplace_services"), {
      ...serviceData,
      createdAt: serverTimestamp(),
      status: "active"
    });
    return { success: true, serviceId: docRef.id };
  } catch (error) {
    console.error("Erreur createService:", error);
    return { success: false, error: error.message };
  }
};

export const getServicesByCategory = async (category, city = null) => {
  try {
    let q = query(
      collection(db, "marketplace_services"),
      where("category", "==", category),
      where("status", "==", "active"),
      orderBy("ranking", "desc")
    );
    
    if (city) {
      q = query(q, where("zones", "array-contains", city));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getServicesByCategory:", error);
    return [];
  }
};

// NOUVELLE FONCTION - Récupérer TOUS les services
export const getAllServices = async () => {
  try {
    const q = query(
      collection(db, "marketplace_services"),
      where("status", "==", "active"),
      orderBy("ranking", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getAllServices:", error);
    return [];
  }
};

// ========================================
// LEADS
// ========================================

export const createLead = async (leadData) => {
  try {
    // Calculer la date à partir de laquelle le client peut noter (10 jours)
    const canRateAfter = new Date();
    canRateAfter.setDate(canRateAfter.getDate() + 0);

    const docRef = await addDoc(collection(db, "marketplace_leads"), {
      ...leadData,
      status: "pending",
      createdAt: serverTimestamp(),
      canRateAfter: canRateAfter,
      hasBeenRated: false,
      reviewId: null
    });
    return { success: true, leadId: docRef.id };
  } catch (error) {
    console.error("Erreur createLead:", error);
    return { success: false, error: error.message };
  }
};

export const getLeadsByProvider = async (providerId) => {
  try {
    const q = query(
      collection(db, "marketplace_leads"),
      where("providerId", "==", providerId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getLeadsByProvider:", error);
    return [];
  }
};

// Récupérer les leads d'un client (pour l'historique et les notes)
export const getLeadsByCustomer = async (customerId) => {
  try {
    const q = query(
      collection(db, "marketplace_leads"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getLeadsByCustomer:", error);
    return [];
  }
};

export const updateLeadStatus = async (leadId, status) => {
  try {
    const leadRef = doc(db, "marketplace_leads", leadId);
    await updateDoc(leadRef, { 
      status,
      contactedAt: status === "contacted" ? serverTimestamp() : null,
      completedAt: status === "completed" ? serverTimestamp() : null
    });
    return { success: true };
  } catch (error) {
    console.error("Erreur updateLeadStatus:", error);
    return { success: false, error: error.message };
  }
};

// ========================================
// PRODUCTS
// ========================================

export const createProduct = async (productData) => {
  try {
    const sellerPayout = productData.price * 0.8;
    const docRef = await addDoc(collection(db, "marketplace_products"), {
      ...productData,
      commission: 20,
      sellerPayout,
      sold: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "active"
    });
    return { success: true, productId: docRef.id };
  } catch (error) {
    console.error("Erreur createProduct:", error);
    return { success: false, error: error.message };
  }
};

export const getProductsByCategory = async (category) => {
  try {
    const q = query(
      collection(db, "marketplace_products"),
      where("category", "==", category),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getProductsByCategory:", error);
    return [];
  }
};

// NOUVELLE FONCTION - Récupérer TOUS les produits
export const getAllProducts = async () => {
  console.log("=== getAllProducts appelé ===");
  try {
    const q = query(
      collection(db, "marketplace_products"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    
    console.log("Query créée, exécution...");
    const snapshot = await getDocs(q);
    console.log("Nombre de produits trouvés:", snapshot.docs.length);
    
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Produits:", products);
    
    return products;
  } catch (error) {
    console.error("=== ERREUR getAllProducts ===");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Full error:", error);
    return [];
  }
};

export const updateProductStock = async (productId, newStock) => {
  try {
    const productRef = doc(db, "marketplace_products", productId);
    await updateDoc(productRef, { 
      stock: newStock,
      status: newStock === 0 ? "out_of_stock" : "active",
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Erreur updateProductStock:", error);
    return { success: false, error: error.message };
  }
};

// ========================================
// ORDERS
// ========================================

export const createOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, "marketplace_orders"), {
      ...orderData,
      status: "pending",
      createdAt: serverTimestamp()
    });
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error("Erreur createOrder:", error);
    return { success: false, error: error.message };
  }
};

export const getOrdersByCustomer = async (customerId) => {
  try {
    const q = query(
      collection(db, "marketplace_orders"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getOrdersByCustomer:", error);
    return [];
  }
};

export const updateOrderStatus = async (orderId, status, trackingNumber = null) => {
  try {
    const orderRef = doc(db, "marketplace_orders", orderId);
    const updateData = { 
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === "paid") updateData.paidAt = serverTimestamp();
    if (status === "shipped") {
      updateData.shippedAt = serverTimestamp();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
    }
    if (status === "delivered") updateData.deliveredAt = serverTimestamp();
    
    await updateDoc(orderRef, updateData);
    return { success: true };
  } catch (error) {
    console.error("Erreur updateOrderStatus:", error);
    return { success: false, error: error.message };
  }
};

// ========================================
// REVIEWS / RATINGS (SYSTÈME DE NOTATION)
// ========================================

/**
 * Créer ou mettre à jour une note pour un prestataire
 * - Si le lead n'a pas encore été noté → crée une nouvelle note
 * - Si le lead a déjà été noté → met à jour la note existante
 */
export const createOrUpdateReview = async (reviewData) => {
  try {
    const { leadId, serviceId, providerId, customerId, rating } = reviewData;

    // Récupérer le lead
    const leadRef = doc(db, "marketplace_leads", leadId);
    const leadSnap = await getDoc(leadRef);
    
    if (!leadSnap.exists()) {
      return { success: false, error: "Lead introuvable" };
    }

    const leadData = leadSnap.data();

    // Si déjà noté, mettre à jour la note existante
    if (leadData.hasBeenRated && leadData.reviewId) {
      const reviewRef = doc(db, "marketplace_reviews", leadData.reviewId);
      await updateDoc(reviewRef, {
        rating,
        updatedAt: serverTimestamp()
      });

      // Recalculer la moyenne du prestataire
      await recalculateServiceRating(serviceId);

      return { success: true, reviewId: leadData.reviewId, updated: true };
    }

    // Sinon, créer une nouvelle note
    const reviewDoc = await addDoc(collection(db, "marketplace_reviews"), {
      leadId,
      serviceId,
      providerId,
      customerId,
      rating,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Mettre à jour le lead
    await updateDoc(leadRef, {
      hasBeenRated: true,
      reviewId: reviewDoc.id
    });

    // Recalculer la moyenne du prestataire
    await recalculateServiceRating(serviceId);

    return { success: true, reviewId: reviewDoc.id, updated: false };

  } catch (error) {
    console.error("Erreur createOrUpdateReview:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer la note associée à un lead
 */
export const getReviewByLead = async (leadId) => {
  try {
    const q = query(
      collection(db, "marketplace_reviews"),
      where("leadId", "==", leadId)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const reviewDoc = snapshot.docs[0];
    return { id: reviewDoc.id, ...reviewDoc.data() };
  } catch (error) {
    console.error("Erreur getReviewByLead:", error);
    return null;
  }
};

/**
 * Recalculer la note moyenne d'un prestataire
 * Appelé automatiquement après chaque création/modification de note
 */
export const recalculateServiceRating = async (serviceId) => {
  try {
    // Récupérer toutes les notes du prestataire
    const q = query(
      collection(db, "marketplace_reviews"),
      where("serviceId", "==", serviceId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Pas de notes, remettre à 0
      const serviceRef = doc(db, "marketplace_services", serviceId);
      await updateDoc(serviceRef, {
        rating: 0,
        reviewsCount: 0
      });
      return;
    }

    // Calculer la moyenne
    let total = 0;
    snapshot.docs.forEach(reviewDoc => {
      total += reviewDoc.data().rating;
    });
    
    const average = total / snapshot.docs.length;
    const count = snapshot.docs.length;

    // Mettre à jour le service
    const serviceRef = doc(db, "marketplace_services", serviceId);
    await updateDoc(serviceRef, {
      rating: Math.round(average * 10) / 10, // Arrondi à 1 décimale (ex: 4.3)
      reviewsCount: count
    });

    console.log(`Service ${serviceId} - Nouvelle note: ${average.toFixed(1)} (${count} avis)`);

  } catch (error) {
    console.error("Erreur recalculateServiceRating:", error);
  }
};

/**
 * Récupérer toutes les notes d'un prestataire
 */
export const getReviewsByService = async (serviceId) => {
  try {
    const q = query(
      collection(db, "marketplace_reviews"),
      where("serviceId", "==", serviceId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getReviewsByService:", error);
    return [];
  }
};

// ========================================
// LEGACY REVIEWS (garder pour compatibilité)
// ========================================

export const createReview = async (reviewData) => {
  try {
    const docRef = await addDoc(collection(db, "marketplace_reviews"), {
      ...reviewData,
      createdAt: serverTimestamp()
    });
    return { success: true, reviewId: docRef.id };
  } catch (error) {
    console.error("Erreur createReview:", error);
    return { success: false, error: error.message };
  }
};

export const getReviewsByTarget = async (targetId, targetType) => {
  try {
    const q = query(
      collection(db, "marketplace_reviews"),
      where("targetId", "==", targetId),
      where("targetType", "==", targetType),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getReviewsByTarget:", error);
    return [];
  }
};