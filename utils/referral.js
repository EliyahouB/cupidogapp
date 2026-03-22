import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment
} from "firebase/firestore";

// ========================================
// GÉNÉRER UN CODE PARRAIN UNIQUE
// ========================================

export const generateReferralCode = (businessName) => {
  const clean = businessName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return clean + random;
};

// ========================================
// CRÉER UN CODE PARRAIN POUR UN PRESTATAIRE
// ========================================

export const createReferralCode = async (userId, businessName) => {
  try {
    const code = generateReferralCode(businessName);
    
    const existing = await getReferralByCode(code);
    if (existing) {
      return await createReferralCode(userId, businessName);
    }

    const docRef = await addDoc(collection(db, "referrals"), {
      referrerId: userId,
      code: code,
      businessName: businessName,
      points: 0,
      totalReferrals: 0,
      isFounder: true,
      freeLeadsEarned: 0,
      boostsEarned: 0,
      freeMonthsEarned: 0,
      createdAt: serverTimestamp()
    });

    return { success: true, code: code, referralId: docRef.id };
  } catch (error) {
    console.error("Erreur createReferralCode:", error);
    return { success: false, error: error.message };
  }
};

// ========================================
// RÉCUPÉRER UN REFERRAL PAR CODE
// ========================================

export const getReferralByCode = async (code) => {
  try {
    const q = query(
      collection(db, "referrals"),
      where("code", "==", code.toUpperCase())
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Erreur getReferralByCode:", error);
    return null;
  }
};

// ========================================
// RÉCUPÉRER LE REFERRAL D'UN PRESTATAIRE
// ========================================

export const getReferralByUserId = async (userId) => {
  try {
    const q = query(
      collection(db, "referrals"),
      where("referrerId", "==", userId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Erreur getReferralByUserId:", error);
    return null;
  }
};

// ========================================
// UTILISER UN CODE PARRAIN (nouvel inscrit)
// ========================================

export const useReferralCode = async (code, newUserId, newUserName) => {
  try {
    const referral = await getReferralByCode(code);
    
    if (!referral) {
      return { success: false, error: "Code invalide" };
    }

    if (referral.referrerId === newUserId) {
      return { success: false, error: "Vous ne pouvez pas utiliser votre propre code" };
    }

    const referralRef = doc(db, "referrals", referral.id);
    
    let updates = {
      points: increment(1),
      totalReferrals: increment(1)
    };

    const newPoints = referral.points + 1;
    
    // 10 points = 2 leads offerts
    if (newPoints === 10) {
      updates.freeLeadsEarned = increment(2);
    }
    // 25 points = 1 boost offert
    if (newPoints === 25) {
      updates.boostsEarned = increment(1);
    }
    // 50 points = 1 mois gratuit
    if (newPoints === 50) {
      updates.freeMonthsEarned = increment(1);
    }
    // 60 points = 2 leads offerts
    if (newPoints === 60) {
      updates.freeLeadsEarned = increment(2);
    }
    // 75 points = 1 boost offert
    if (newPoints === 75) {
      updates.boostsEarned = increment(1);
    }
    // 100 points = 1 mois gratuit
    if (newPoints === 100) {
      updates.freeMonthsEarned = increment(1);
    }

    await updateDoc(referralRef, updates);

    await addDoc(collection(db, "referrals", referral.id, "history"), {
      referredUserId: newUserId,
      referredUserName: newUserName,
      createdAt: serverTimestamp()
    });

    // Donner un boost gratuit au filleul
    const profileRef = doc(db, "profiles", newUserId);
    await updateDoc(profileRef, {
      freeBoosts: increment(1),
      referredBy: referral.referrerId,
      referredByCode: code
    });

    return { 
      success: true, 
      referrerName: referral.businessName,
      newPoints: newPoints,
      freeBoostGiven: true
    };
  } catch (error) {
    console.error("Erreur useReferralCode:", error);
    return { success: false, error: error.message };
  }
};

// ========================================
// RÉCUPÉRER L'HISTORIQUE DES PARRAINAGES
// ========================================

export const getReferralHistory = async (referralId) => {
  try {
    const q = query(
      collection(db, "referrals", referralId, "history")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error("Erreur getReferralHistory:", error);
    return [];
  }
};

// ========================================
// CALCULER LES RÉCOMPENSES
// ========================================

export const calculateRewards = (points) => {
  return {
    freeLeads: Math.floor(points / 10) * 2,
    boosts: Math.floor(points / 25),
    freeMonths: Math.floor(points / 50),
    nextFreeLeads: 10 - (points % 10),
    nextBoost: 25 - (points % 25),
    nextFreeMonth: 50 - (points % 50)
  };
};