import { db } from "../config/firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";

// GÉNÉRER FACTURE CLIENT (appelée depuis Checkout.js)
export const generateCustomerInvoice = async (orderData) => {
  try {
    const invoiceData = {
      type: "customer_invoice",
      invoiceNumber: `CUST-${Date.now()}`,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      
      shippingAddress: orderData.shippingAddress,
      
      items: orderData.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
      })),
      
      subtotal: orderData.subtotal,
      shipping: 0, // Gratuit
      total: orderData.total,
      
      paymentMethod: orderData.paymentMethod,
      status: "paid", // ou "pending"
      
      createdAt: new Date(),
      paidAt: orderData.paymentMethod === "cash_on_delivery" ? null : new Date(),
      
      // Info vendeur (pour facture légale)
      sellers: [], // On va remplir après
    };

    // Récupérer les infos pro de chaque vendeur
    const sellerIds = [...new Set(orderData.items.map(item => item.sellerId))];
    
    for (const sellerId of sellerIds) {
      const proDoc = await getDoc(doc(db, "professional_accounts", sellerId));
      if (proDoc.exists()) {
        const proData = proDoc.data();
        invoiceData.sellers.push({
          sellerId: sellerId,
          companyName: proData.companyName,
          osekNumber: proData.osekNumber,
          hpNumber: proData.hpNumber,
          address: proData.address,
          phone: proData.phone,
          email: proData.email,
        });
      }
    }

    const docRef = await addDoc(collection(db, "invoices"), invoiceData);
    
    return { success: true, invoiceId: docRef.id };
  } catch (error) {
    console.error("Erreur generateCustomerInvoice:", error);
    return { success: false, error: error.message };
  }
};

// GÉNÉRER FACTURE MENSUELLE LEADS (prestataire)
export const generateMonthlyLeadsInvoice = async (providerId, month, year) => {
  try {
    // Récupérer tous les leads du mois
    const leadsQuery = query(
      collection(db, "marketplace_leads"),
      where("providerId", "==", providerId),
      where("status", "in", ["contacted", "completed"])
    );
    const leadsSnap = await getDocs(leadsQuery);
    
    const leadsData = [];
    let totalAmount = 0;

    leadsSnap.forEach(doc => {
      const lead = doc.data();
      const leadDate = lead.createdAt.toDate();
      
      // Vérifier si le lead est du bon mois
      if (leadDate.getMonth() === month && leadDate.getFullYear() === year) {
        leadsData.push({
          leadId: doc.id,
          customerName: lead.customerName,
          date: lead.createdAt,
          amount: lead.leadPrice,
        });
        totalAmount += lead.leadPrice;
      }
    });

    if (leadsData.length === 0) {
      return { success: false, message: "Aucun lead ce mois-ci" };
    }

    // Récupérer infos pro
    const proDoc = await getDoc(doc(db, "professional_accounts", providerId));
    const proData = proDoc.exists() ? proDoc.data() : {};

    const invoiceData = {
      type: "lead_invoice",
      invoiceNumber: `LEAD-${providerId.slice(0, 6)}-${year}${String(month + 1).padStart(2, '0')}`,
      providerId: providerId,
      providerName: proData.companyName || "Prestataire",
      
      month: month,
      year: year,
      period: `${month + 1}/${year}`,
      
      leads: leadsData,
      totalLeads: leadsData.length,
      totalAmount: totalAmount,
      
      tva: totalAmount * 0.17, // TVA Israël 17%
      totalWithTva: totalAmount * 1.17,
      
      status: "unpaid", // unpaid, paid
      dueDate: new Date(year, month + 1, 15), // 15 du mois suivant
      
      createdAt: new Date(),
      paidAt: null,
    };

    const docRef = await addDoc(collection(db, "invoices"), invoiceData);
    
    return { success: true, invoiceId: docRef.id };
  } catch (error) {
    console.error("Erreur generateMonthlyLeadsInvoice:", error);
    return { success: false, error: error.message };
  }
};

// GÉNÉRER FACTURE MENSUELLE COMMISSIONS (vendeur)
export const generateMonthlyCommissionInvoice = async (sellerId, month, year) => {
  try {
    // Récupérer toutes les commandes du mois
    const ordersQuery = collection(db, "marketplace_orders");
    const ordersSnap = await getDocs(ordersQuery);
    
    const salesData = [];
    let totalSales = 0;
    let totalCommission = 0;
    let totalPayout = 0;

    ordersSnap.forEach(doc => {
      const order = doc.data();
      const orderDate = order.createdAt.toDate();
      
      // Vérifier si commande du bon mois et contient produits du vendeur
      if (orderDate.getMonth() === month && orderDate.getFullYear() === year) {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.sellerId === sellerId) {
              const itemTotal = item.price * item.quantity;
              const itemCommission = item.commission * item.quantity;
              const itemPayout = item.sellerPayout * item.quantity;
              
              salesData.push({
                orderId: doc.id,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.price,
                total: itemTotal,
                commission: itemCommission,
                payout: itemPayout,
                date: order.createdAt,
              });
              
              totalSales += itemTotal;
              totalCommission += itemCommission;
              totalPayout += itemPayout;
            }
          });
        }
      }
    });

    if (salesData.length === 0) {
      return { success: false, message: "Aucune vente ce mois-ci" };
    }

    // Récupérer infos pro
    const proDoc = await getDoc(doc(db, "professional_accounts", sellerId));
    const proData = proDoc.exists() ? proDoc.data() : {};

    const invoiceData = {
      type: "commission_invoice",
      invoiceNumber: `COMM-${sellerId.slice(0, 6)}-${year}${String(month + 1).padStart(2, '0')}`,
      sellerId: sellerId,
      sellerName: proData.companyName || "Vendeur",
      
      month: month,
      year: year,
      period: `${month + 1}/${year}`,
      
      sales: salesData,
      totalOrders: salesData.length,
      totalSales: totalSales,
      totalCommission: totalCommission, // 20% pour CupiDog
      totalPayout: totalPayout, // 80% pour vendeur
      
      commissionRate: 0.20,
      payoutRate: 0.80,
      
      tva: totalCommission * 0.17, // TVA sur commission
      
      status: "unpaid", // unpaid, paid
      dueDate: new Date(year, month + 1, 15), // 15 du mois suivant
      
      createdAt: new Date(),
      paidAt: null,
    };

    const docRef = await addDoc(collection(db, "invoices"), invoiceData);
    
    return { success: true, invoiceId: docRef.id };
  } catch (error) {
    console.error("Erreur generateMonthlyCommissionInvoice:", error);
    return { success: false, error: error.message };
  }
};

// RÉCUPÉRER FACTURES PAR UTILISATEUR
export const getInvoicesByUser = async (userId, userType) => {
  try {
    let q;
    
    if (userType === "provider") {
      q = query(
        collection(db, "invoices"),
        where("providerId", "==", userId)
      );
    } else if (userType === "seller") {
      q = query(
        collection(db, "invoices"),
        where("sellerId", "==", userId)
      );
    } else if (userType === "customer") {
      q = query(
        collection(db, "invoices"),
        where("customerId", "==", userId)
      );
    }

    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return invoices;
  } catch (error) {
    console.error("Erreur getInvoicesByUser:", error);
    return [];
  }
};

// MARQUER FACTURE COMME PAYÉE
export const markInvoiceAsPaid = async (invoiceId) => {
  try {
    const invoiceRef = doc(db, "invoices", invoiceId);
    await updateDoc(invoiceRef, {
      status: "paid",
      paidAt: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Erreur markInvoiceAsPaid:", error);
    return { success: false, error: error.message };
  }
};