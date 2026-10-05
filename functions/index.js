const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();

// ========================================
// CONFIGURATION AVEC .ENV
// ========================================
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;
const adminPhone = process.env.ADMIN_PHONE;

// CONFIGURATION EMAIL
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// CONFIGURATION TWILIO
const client = twilioSid && twilioToken ? new twilio(twilioSid, twilioToken) : null;

const maskPhoneNumber = (phoneNumber) => {
  if (typeof phoneNumber !== "string") return "<invalid>";
  const prefixLength = Math.max(1, phoneNumber.length - 7);
  return `${phoneNumber.slice(0, prefixLength)}***${phoneNumber.slice(-4)}`;
};

const normalizePhoneNumber = (phoneNumber) => {
  if (typeof phoneNumber !== "string" || !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid phone number");
  }
  return phoneNumber;
};

const getOtpDocumentId = (phoneNumber) =>
  crypto.createHash("sha256").update(phoneNumber).digest("hex");

const hashOtp = (phoneNumber, code) =>
  crypto.createHmac("sha256", twilioToken).update(`${phoneNumber}:${code}`).digest("hex");

exports.sendOTP = functions.https.onCall(async (data) => {
  const receivedPhoneNumber = data?.phoneNumber;
  const phoneNumber = normalizePhoneNumber(receivedPhoneNumber);
  console.info("OTP phone format", {
    receivedMasked: maskPhoneNumber(receivedPhoneNumber),
    validatedE164Masked: maskPhoneNumber(phoneNumber),
    unchanged: receivedPhoneNumber === phoneNumber,
  });
  const purpose = data?.purpose;
  const userType = data?.userType;
  const providerType = data?.providerType;

  if (!client || !twilioFrom || !twilioFrom.startsWith("whatsapp:")) {
    throw new functions.https.HttpsError("failed-precondition", "WhatsApp is not configured");
  }
  if (purpose !== "signup" && purpose !== "signin") {
    throw new functions.https.HttpsError("invalid-argument", "Invalid OTP purpose");
  }
  if (purpose === "signup" && !["particulier", "professionnel"].includes(userType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid user type");
  }
  if (purpose === "signup" && userType === "professionnel" && !["prestataire", "vendeur"].includes(providerType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid provider type");
  }

  const db = admin.firestore();
  const otpRef = db.collection("phone_otp_requests").doc(getOtpDocumentId(phoneNumber));
  const rateLimitRef = db.collection("phone_otp_rate_limits").doc(getOtpDocumentId(phoneNumber));
  const now = Date.now();
  let sendCount = 1;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const existing = snapshot.exists ? snapshot.data() : {};
    const cooldownUntil = existing.cooldownUntil?.toMillis?.() || 0;
    const windowStartedAt = existing.windowStartedAt?.toMillis?.() || 0;

    if (cooldownUntil > now) {
      throw new functions.https.HttpsError("resource-exhausted", "Please wait before requesting another code");
    }

    sendCount = windowStartedAt > now - 60 * 60 * 1000 ? existing.sendCount || 0 : 0;
    if (sendCount >= 5) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many OTP requests");
    }
    sendCount += 1;

    transaction.set(otpRef, {
      purpose,
      userType: userType || null,
      providerType: providerType || null,
      status: "sending",
      codeHash: null,
      attempts: 0,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + 5 * 60 * 1000),
    });
    transaction.set(rateLimitRef, {
      sendCount,
      windowStartedAt: admin.firestore.Timestamp.fromMillis(
        windowStartedAt > now - 60 * 60 * 1000 ? windowStartedAt : now
      ),
      cooldownUntil: admin.firestore.Timestamp.fromMillis(now + 60 * 1000),
      cleanupAt: admin.firestore.Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
    });
  });

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  console.info("OTP generated", {
    phoneMasked: maskPhoneNumber(phoneNumber),
    codeLength: code.length,
    sixDigitFormat: /^\d{6}$/.test(code),
  });
  try {
    await client.messages.create({
      from: twilioFrom,
      to: `whatsapp:${phoneNumber}`,
      body: `Votre code CupiDog est ${code}. Il expire dans 5 minutes. Ne le partagez avec personne.`,
    });

    const codeHash = hashOtp(phoneNumber, code);
    await otpRef.update({
      status: "sent",
      codeHash,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });
    console.info("OTP hash stored", {
      phoneMasked: maskPhoneNumber(phoneNumber),
      hashStored: true,
      hashLength: codeHash.length,
    });
    return { success: true };
  } catch (error) {
    await otpRef.update({ status: "send_failed", codeHash: null });
    console.error("WhatsApp OTP delivery failed:", error.message);
    throw new functions.https.HttpsError("unavailable", "Unable to send WhatsApp code");
  }
});

exports.verifyOTP = functions.https.onCall(async (data) => {
  const receivedPhoneNumber = data?.phoneNumber;
  const phoneNumber = normalizePhoneNumber(receivedPhoneNumber);
  const code = data?.code;
  console.info("OTP verification input", {
    receivedMasked: maskPhoneNumber(receivedPhoneNumber),
    validatedE164Masked: maskPhoneNumber(phoneNumber),
    unchanged: receivedPhoneNumber === phoneNumber,
    codeLength: typeof code === "string" ? code.length : null,
  });
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid verification code");
  }

  const db = admin.firestore();
  const otpRef = db.collection("phone_otp_requests").doc(getOtpDocumentId(phoneNumber));
  const verification = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(otpRef);
    if (!snapshot.exists) return { valid: false };

    const otp = snapshot.data();
    if (otp.status !== "sent" || otp.expiresAt.toMillis() <= Date.now()) {
      transaction.update(otpRef, { status: "expired", codeHash: null });
      return { valid: false };
    }

    const expectedHash = Buffer.from(otp.codeHash, "hex");
    const submittedHash = Buffer.from(hashOtp(phoneNumber, code), "hex");
    const hashMatches = expectedHash.length === submittedHash.length &&
      crypto.timingSafeEqual(expectedHash, submittedHash);
    console.info("OTP hash comparison", {
      phoneMasked: maskPhoneNumber(phoneNumber),
      status: otp.status,
      storedHashPresent: typeof otp.codeHash === "string",
      storedHashLength: expectedHash.length,
      calculatedHashLength: submittedHash.length,
      hashMatches,
      expiresAt: otp.expiresAt?.toDate?.().toISOString() || null,
    });
    if (!hashMatches) {
      const attempts = (otp.attempts || 0) + 1;
      if (attempts >= 5) {
        transaction.update(otpRef, { attempts, status: "locked", codeHash: null });
      } else {
        transaction.update(otpRef, { attempts });
      }
      return { valid: false };
    }

    transaction.update(otpRef, { status: "used", codeHash: null });
    return {
      valid: true,
      purpose: otp.purpose,
      userType: otp.userType,
      providerType: otp.providerType,
    };
  });

  if (!verification.valid) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid or expired verification code");
  }

  let userRecord;
  let createdNewUser = false;
  try {
    userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
  } catch (error) {
    if (error.code !== "auth/user-not-found" || verification.purpose !== "signup") {
      throw new functions.https.HttpsError("not-found", "No account exists for this phone number");
    }
    userRecord = await admin.auth().createUser({ phoneNumber });
    createdNewUser = true;
  }

  const profileRef = db.collection("profiles").doc(userRecord.uid);
  const profileSnapshot = await profileRef.get();
  if (verification.purpose === "signup" && profileSnapshot.exists) {
    throw new functions.https.HttpsError("already-exists", "An account already exists for this phone number");
  }

  if (!profileSnapshot.exists) {
    let userType = verification.userType || userRecord.customClaims?.userType;
    let providerType = verification.providerType || userRecord.customClaims?.providerType;

    if (verification.purpose === "signin") {
      const professionalSnapshot = await db.collection("professional_accounts").doc(userRecord.uid).get();
      if (professionalSnapshot.exists) {
        const activityType = professionalSnapshot.data().activityType;
        userType = "professionnel";
        providerType = activityType === "seller" || activityType === "vendeur"
          ? "vendeur"
          : "prestataire";
      }
    }

    if (userType !== "professionnel") {
      userType = "particulier";
      providerType = null;
    }

    const profileData = {
      uid: userRecord.uid,
      phone: phoneNumber,
      email: userRecord.email || "",
      createdAt: userRecord.metadata?.creationTime
        ? admin.firestore.Timestamp.fromDate(new Date(userRecord.metadata.creationTime))
        : admin.firestore.FieldValue.serverTimestamp(),
      authProvider: "phone",
      userType,
      ...(userType === "professionnel" && {
        providerType,
        providerStatus: "pending",
        subscription: "none",
      }),
      name: userRecord.displayName || "",
      displayName: userRecord.displayName || "",
      photoUrl: userRecord.photoURL || null,
      city: "",
      bio: "",
      hideProfile: false,
      nomadMode: true,
      emailVerified: false,
      phoneVerified: true,
      onboardingCompleted: false,
      purpose: "",
      gender: "",
      abonnement: "gratuit",
    };

    try {
      await profileRef.create(profileData);
    } catch (error) {
      if (createdNewUser) {
        await admin.auth().deleteUser(userRecord.uid).catch(() => {});
      }
      throw new functions.https.HttpsError("internal", "Unable to create user profile");
    }
  }

  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  return { customToken };
});

const resolveTranzilaToken = (tranzilaData) => {
  const payload = tranzilaData || {};
  const candidates = [
    payload.Token,
    payload.token,
    payload.TranzilaToken,
    payload.tranzilaToken,
    payload.TokenId,
    payload.tokenId,
    payload.TokenID,
    payload.tokenID,
    payload.ConfirmationCode,
    payload.Confirmationcode,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim().length > 0) || null;
};

// ========================================
// FUNCTION 1 : Nouveau compte professionnel créé
// (Alerte Admin + Email de Bienvenue Client)
// ========================================
exports.onNewProfessionalAccount = functions.firestore
  .document("professional_accounts/{userId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const userId = context.params.userId;
    const companyName = data.companyName || "Inconnu";
    const clientEmail = data.email;

    // 1. EMAIL POUR TOI (ADMIN)
    const adminMailOptions = {
      from: "CupiDog <" + gmailEmail + ">",
      to: gmailEmail,
      subject: `🔔 Nouveau compte professionnel - ${companyName}`,
      html: `
        <h2>Nouveau compte professionnel à valider</h2>
        <p><strong>Type :</strong> ${data.activityType === "service_provider" ? "Prestataire de services" : "Vendeur de produits"}</p>
        <p><strong>Entreprise :</strong> ${companyName}</p>
        <p><strong>Email :</strong> ${clientEmail}</p>
        <p><strong>Téléphone :</strong> ${data.phone || "Non renseigné"}</p>
        ${data.serviceCategory ? `<p><strong>Catégorie :</strong> ${data.serviceCategory}</p>` : ""}
        ${data.subscriptionPlan ? `<p><strong>Abonnement :</strong> ${data.subscriptionPlan === "pro" ? "PRO (159₪/mois)" : "PRO+ (299₪/mois)"}</p>` : ""}
        <p><strong>Adresse :</strong> ${data.address?.street || ""}, ${data.address?.city || ""}</p>
        <hr>
        <p><strong>👉 Valider le compte :</strong></p>
        <p>Va sur Firebase Console → professional_accounts → ${userId}</p>
        <p>Change <code>status: "pending"</code> en <code>status: "approved"</code></p>
        <hr>
        <p><em>Email envoyé automatiquement par CupiDog</em></p>
      `,
    };

    // 2. EMAIL DE BIENVENUE POUR LE CLIENT (PRO)
    const welcomeMailOptions = {
      from: "CupiDog <" + gmailEmail + ">",
      to: clientEmail,
      subject: `Bienvenue chez CupiDog, ${companyName} ! 🐾`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h1 style="color: #FF6B6B;">Bienvenue dans l'aventure CupiDog !</h1>
          <p>Bonjour <strong>${companyName}</strong>,</p>
          <p>Merci pour votre inscription en tant que professionnel. Votre dossier est actuellement en cours de révision par notre équipe.</p>
          <p><strong>Prochaine étape :</strong> Une fois votre profil validé, vous recevrez une notification et vous pourrez commencer à proposer vos services ou produits sur l'application.</p>
          <br>
          <p>À très vite,</p>
          <p>L'équipe CupiDog 🐾</p>
        </div>
      `,
    };

    try {
      const promises = [
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(welcomeMailOptions),
      ];

      // WhatsApp seulement si Twilio configuré
      if (client && twilioFrom && adminPhone) {
        promises.push(client.messages.create({
          from: twilioFrom,
          to: adminPhone,
          body: `🐾 *CupiDog Alert* \n\nNouveau compte pro : *${companyName}*\nEmail : ${clientEmail}\n\nUn email de bienvenue a été envoyé au client.`
        }));
      }

      await Promise.all(promises);
      console.log("✅ Notifications Admin + Bienvenue Client envoyées :", companyName);
      return null;
    } catch (error) {
      console.error("❌ Erreur lors des notifications :", error);
      return null;
    }
  });

// ========================================
// FUNCTION 2 : Notification nouveau message
// ========================================
exports.sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const senderId = messageData.senderId;
      const messageText = messageData.text;
      const conversationId = context.params.conversationId;

      const conversationDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) return null;

      const conversationData = conversationDoc.data();
      const recipientId = conversationData.participants.find(id => id !== senderId);
      if (!recipientId) return null;

      const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
      const pushToken = userDoc.data()?.pushToken;
      if (!pushToken) return null;

      const dogName = conversationData.dogName || 'CupiDog';
      const profilesRef = admin.firestore().collection('profiles');
      const profileQuery = await profilesRef.where('uid', '==', senderId).get();
      const senderName = profileQuery.empty ? "Quelqu'un" : profileQuery.docs[0].data().name;

      await admin.messaging().send({
        token: pushToken,
        notification: {
          title: `${senderName} - ${dogName}`,
          body: messageText.substring(0, 100),
        },
        data: { type: 'message', conversationId, senderId },
      });

      console.log('✅ Notification message envoyée !');
      return null;
    } catch (error) {
      console.error('❌ Erreur notification message:', error);
      return null;
    }
  });

// ========================================
// FUNCTION 3 : Notification nouveau like
// ========================================
exports.sendLikeNotification = functions.firestore
  .document('likes/{likeId}')
  .onCreate(async (snap, context) => {
    try {
      const likeData = snap.data();
      const { fromUserId, toOwnerId, toDogId } = likeData;

      const ownerDoc = await admin.firestore().collection('users').doc(toOwnerId).get();
      const pushToken = ownerDoc.data()?.pushToken;
      if (!pushToken) return null;

      const profileQuery = await admin.firestore().collection('profiles').where('uid', '==', fromUserId).get();
      const userName = profileQuery.empty ? "Quelqu'un" : profileQuery.docs[0].data().name;

      const dogDoc = await admin.firestore().collection('users').doc(toOwnerId).collection('dogs').doc(toDogId).get();
      const dogName = dogDoc.data()?.dogName || 'ton chien';

      await admin.messaging().send({
        token: pushToken,
        notification: {
          title: '❤️ Nouveau like!',
          body: `${userName} a liké ${dogName}`,
        },
        data: { type: 'like', fromUserId, dogId: toDogId },
      });

      console.log('✅ Notification like envoyée !');
      return null;
    } catch (error) {
      console.error('❌ Erreur notification like:', error);
      return null;
    }
  });

// ========================================
// FUNCTION 4 : Notification nouveau match
// ========================================
exports.sendMatchNotification = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snap, context) => {
    try {
      const { userA, userB } = snap.data();

      const [u1, u2] = await Promise.all([
        admin.firestore().collection('users').doc(userA).get(),
        admin.firestore().collection('users').doc(userB).get()
      ]);

      const profiles = admin.firestore().collection('profiles');
      const [p1, p2] = await Promise.all([
        profiles.where('uid', '==', userA).get(),
        profiles.where('uid', '==', userB).get()
      ]);

      const name1 = p1.empty ? "Quelqu'un" : p1.docs[0].data().name;
      const name2 = p2.empty ? "Quelqu'un" : p2.docs[0].data().name;

      const sends = [];
      if (u1.data()?.pushToken) {
        sends.push(admin.messaging().send({
          token: u1.data().pushToken,
          notification: { title: '🎉 Match!', body: `Vous avez matché avec ${name2}!` },
          data: { type: 'match', matchId: context.params.matchId, otherUserId: userB }
        }));
      }
      if (u2.data()?.pushToken) {
        sends.push(admin.messaging().send({
          token: u2.data().pushToken,
          notification: { title: '🎉 Match!', body: `Vous avez matché avec ${name1}!` },
          data: { type: 'match', matchId: context.params.matchId, otherUserId: userA }
        }));
      }

      await Promise.all(sends);
      console.log('✅ Notifications match envoyées !');
      return null;
    } catch (error) {
      console.error('❌ Erreur notification match:', error);
      return null;
    }
  });

// ========================================
// FUNCTION 5 : Enregistrement de token CB pro
// ========================================
exports.registerProTranzilaToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { cardNumber, expiryDate, cvv, cardHolder } = data || {};

  if (!cardNumber || !expiryDate || !cvv) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields");
  }

  const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
  const ccno = cardNumber.replace(/\s/g, "");
  const expdate = expiryDate.replace("/", "");
  const params = new URLSearchParams({
    supplier: "cupidog",
    TranzilaTK: "cupidogtok",
    apikey: tranzilaPrivateKey,
    sum: "0",
    currency: "1",
    ccno,
    expdate,
    mycvv: cvv,
    cred_type: "1",
    tranmode: "V",
    response_return_format: "json",
    card_holder: cardHolder || "",
  });

  let tranzilaData;
  if (process.env.TRANZILA_TEST_MODE === "true") {
    console.log("⚠️ TRANZILA_TEST_MODE actif — tokenisation de carte simulée");
    tranzilaData = { Response: "000", ConfirmationCode: "TEST-TOKEN-" + Date.now(), Token: "TEST_TOKEN_" + Date.now() };
  } else {
    try {
      const response = await axios.post(
        "https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      tranzilaData = typeof response.data === "string"
        ? Object.fromEntries(new URLSearchParams(response.data))
        : response.data;
    } catch (err) {
      console.error("Tranzila token registration error:", err.message);
      throw new functions.https.HttpsError("unavailable", "Payment gateway unreachable");
    }
  }

  const responseCode = tranzilaData.Response || tranzilaData.response;
  if (responseCode !== "000") {
    throw new functions.https.HttpsError("aborted", `payment_declined:${responseCode}`);
  }

  const token = resolveTranzilaToken(tranzilaData);
  if (!token) {
    throw new functions.https.HttpsError("internal", "No token returned by Tranzila");
  }

  const db = admin.firestore();
  await db.collection("professional_accounts").doc(context.auth.uid).set({
    tranzilaToken: token,
    cardOnFile: true,
    cardLastFourDigits: ccno.slice(-4),
    tokenRegisteredAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "pending",
  }, { merge: true });

  return { success: true, token };
});

// ========================================
// FUNCTION 6 : Paiement Tranzila + mise à jour Firestore
// ========================================
exports.processPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { plan, price, cardNumber, expiryDate, cvv } = data;

  if (!plan || !price || !cardNumber || !expiryDate || !cvv) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields");
  }

  const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
  const ccno = cardNumber.replace(/\s/g, "");
  const expdate = expiryDate.replace("/", ""); // MM/YY → MMYY

  const params = new URLSearchParams({
    supplier: "cupidog",
    TranzilaTK: "cupidogtok",
    apikey: tranzilaPrivateKey,
    sum: price.toString(),
    currency: "1", // ILS
    ccno,
    expdate,
    mycvv: cvv,
    cred_type: "1",
    tranmode: "V", // V = Validation (sandbox/test, pas de débit réel)
    response_return_format: "json",
  });

  let tranzilaData;
  if (process.env.TRANZILA_TEST_MODE === "true") {
    console.log("⚠️ TRANZILA_TEST_MODE actif — paiement simulé");
    tranzilaData = { Response: "000", ConfirmationCode: "TEST-" + Date.now() };
  } else {
    try {
      const response = await axios.post(
        "https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      tranzilaData = typeof response.data === "string"
        ? Object.fromEntries(new URLSearchParams(response.data))
        : response.data;
    } catch (err) {
      console.error("Tranzila HTTP error:", err.message);
      throw new functions.https.HttpsError("unavailable", "Payment gateway unreachable");
    }
  }

  console.log("Tranzila full response:", JSON.stringify(tranzilaData));

  const responseCode = tranzilaData.Response || tranzilaData.response;
  if (responseCode !== "000") {
    console.warn("Tranzila decline:", responseCode);
    throw new functions.https.HttpsError("aborted", `payment_declined:${responseCode}`);
  }

  const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";
  const userId = context.auth.uid;
  const db = admin.firestore();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await Promise.all([
    db.collection("subscriptions").add({
      userId,
      plan,
      price,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionEndDate: expiresAt,
      autoRenew: true,
      paymentMethod: "card",
      lastFourDigits: ccno.slice(-4),
      tranzilaConfirmation: confirmation,
    }),
    db.collection("profiles").doc(userId).update({
      abonnement: plan,
      subscriptionEndDate: expiresAt,
    }),
    db.collection("invoices").add({
      userId,
      type: "subscription",
      plan,
      amount: price,
      status: "paid",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      tranzilaConfirmation: confirmation,
    }),
  ]);

  return { success: true, confirmation };
});

// ========================================
// FUNCTION 6 : Débit automatique des leads
// ========================================
exports.processLeadPayment = functions.firestore
  .document("marketplace_leads/{leadId}")
  .onCreate(async (snap, context) => {
    try {
      const leadData = snap.data();
      const leadId = context.params.leadId;
      const providerId = leadData.providerId;

      if (!providerId) {
        console.warn("Lead sans providerId, débit ignoré");
        return null;
      }

      const providerDoc = await admin.firestore().collection("professional_accounts").doc(providerId).get();
      if (!providerDoc.exists) {
        console.warn(`Compte pro introuvable pour le lead ${leadId}`);
        return null;
      }

      const providerData = providerDoc.data() || {};
      const plan = (providerData.subscriptionPlan || "pro").toLowerCase();
      const isProPlus = plan === "pro+" || plan === "pro_plus";
      const category = (leadData.serviceCategory || "").toLowerCase();

      const leadPrices = {
        veterinaire: { pro: 20, pro_plus: 15 },
        toiletteur: { pro: 18, pro_plus: 13 },
        dogwalker: { pro: 12, pro_plus: 8 },
        educateur: { pro: 25, pro_plus: 18 },
        assurance: { pro: 35, pro_plus: 25 },
      };

      const amount = leadPrices[category]
        ? leadPrices[category][isProPlus ? "pro_plus" : "pro"]
        : 0;

      const db = admin.firestore();
      const invoiceRef = db.collection("invoices").doc();
      const invoiceData = {
        userId: providerId,
        type: "lead",
        leadId,
        serviceCategory: category || "unknown",
        plan,
        amount,
        currency: "ILS",
        status: "pending_payment",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await invoiceRef.set(invoiceData);

      if (!amount || amount <= 0) {
        await db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "skipped",
          invoiceId: invoiceRef.id,
        });
        return null;
      }

      if (!providerData.tranzilaToken) {
        await db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "pending_token",
          invoiceId: invoiceRef.id,
        });

        if (providerData.email || leadData.providerEmail) {
          try {
            await transporter.sendMail({
              from: "CupiDog <" + gmailEmail + ">",
              to: providerData.email || leadData.providerEmail,
              subject: "⚠️ Enregistrez votre carte pour débiter les leads",
              html: `
                <div style="font-family:sans-serif;line-height:1.6;">
                  <h2>Débit des leads CupiDog</h2>
                  <p>Un nouveau lead a été reçu, mais aucun token de carte bancaire n'est encore enregistré pour votre compte.</p>
                  <p>Pour continuer à débiter automatiquement les leads, merci d'enregistrer votre carte bancaire dans votre espace professionnel.</p>
                  <p>Montant estimé : <strong>${amount}₪</strong></p>
                </div>
              `,
            });
          } catch (mailErr) {
            console.error("Erreur envoi email pro pour token CB:", mailErr.message);
          }
        }

        return null;
      }

      const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
      if (!tranzilaPrivateKey) {
        console.warn("TRANZILA_PRIVATE_KEY manquant, débit ignoré");
        await invoiceRef.update({ status: "failed", failureReason: "missing_tranzila_key" });
        await db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "failed",
          invoiceId: invoiceRef.id,
        });
        return null;
      }

      const params = new URLSearchParams({
        supplier: "cupidog",
        TranzilaTK: "cupidogtok",
        apikey: tranzilaPrivateKey,
        sum: amount.toString(),
        currency: "1",
        token: providerData.tranzilaToken,
        cred_type: "1",
        tranmode: "V",
        response_return_format: "json",
      });

      let tranzilaData;
      if (process.env.TRANZILA_TEST_MODE === "true") {
        console.log("⚠️ TRANZILA_TEST_MODE actif — débit de lead simulé");
        tranzilaData = { Response: "000", ConfirmationCode: "TEST-LEAD-" + Date.now() };
      } else {
        try {
          const response = await axios.post(
            "https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi",
            params.toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          tranzilaData = typeof response.data === "string"
            ? Object.fromEntries(new URLSearchParams(response.data))
            : response.data;
        } catch (err) {
          console.error("Tranzila lead payment error:", err.message);
          await invoiceRef.update({ status: "failed", failureReason: err.message });
          await db.collection("marketplace_leads").doc(leadId).update({
            paymentStatus: "failed",
            invoiceId: invoiceRef.id,
          });
          return null;
        }
      }

      const responseCode = tranzilaData.Response || tranzilaData.response;
      if (responseCode !== "000") {
        await invoiceRef.update({ status: "failed", failureReason: responseCode });
        await db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "failed",
          invoiceId: invoiceRef.id,
        });
        return null;
      }

      const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";
      await Promise.all([
        invoiceRef.update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          tranzilaConfirmation: confirmation,
        }),
        db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "paid",
          invoiceId: invoiceRef.id,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          amountCharged: amount,
        }),
      ]);

      return null;
    } catch (error) {
      console.error("❌ Erreur processLeadPayment:", error);
      return null;
    }
  });

// ========================================
// FUNCTION 7 : Paiement CB commande marketplace
// ========================================
exports.processMarketplacePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { orderId, amount, cardNumber, expiryDate, cvv, customerPhone, customerName, customerEmail, items, shippingAddress } = data;

  console.log(`📬 customerEmail reçu: "${customerEmail || "VIDE"}"`);

  if (!orderId || !amount || !cardNumber || !expiryDate || !cvv) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields");
  }

  const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
  const ccno = cardNumber.replace(/\s/g, "");
  const expdate = expiryDate.replace("/", "");

  const params = new URLSearchParams({
    supplier: "cupidog",
    TranzilaTK: "cupidogtok",
    apikey: tranzilaPrivateKey,
    sum: amount.toString(),
    currency: "1",
    ccno,
    expdate,
    mycvv: cvv,
    cred_type: "1",
    tranmode: "V",
    response_return_format: "json",
  });

  let tranzilaData;
  if (process.env.TRANZILA_TEST_MODE === "true") {
    console.log("⚠️ TRANZILA_TEST_MODE actif — paiement marketplace simulé");
    tranzilaData = { Response: "000", ConfirmationCode: "TEST-MKT-" + Date.now() };
  } else {
    try {
      const response = await axios.post(
        "https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      tranzilaData = typeof response.data === "string"
        ? Object.fromEntries(new URLSearchParams(response.data))
        : response.data;
    } catch (err) {
      console.error("Tranzila HTTP error:", err.message);
      throw new functions.https.HttpsError("unavailable", "Payment gateway unreachable");
    }
  }

  const responseCode = tranzilaData.Response || tranzilaData.response;
  if (responseCode !== "000") {
    throw new functions.https.HttpsError("aborted", `payment_declined:${responseCode}`);
  }

  const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";
  const db = admin.firestore();

  // Marquer la commande comme payée
  await db.collection("marketplace_orders").doc(orderId).update({
    status: "paid",
    paymentMethod: "credit_card",
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    tranzilaConfirmation: confirmation,
    lastFourDigits: ccno.slice(-4),
  });

  // Adresse livraison (réutilisée dans WhatsApp + email client)
  const addressLine = shippingAddress
    ? `${shippingAddress.street || ""}, ${shippingAddress.city || ""}${shippingAddress.zip ? " " + shippingAddress.zip : ""}`.trim().replace(/^,\s*/, "")
    : "Non renseignée";

  // WhatsApp de confirmation client via Twilio
  if (client && customerPhone) {
    try {
      const normalizedPhone = customerPhone.startsWith("+")
        ? customerPhone
        : `+972${customerPhone.replace(/^0/, "")}`;

      await client.messages.create({
        from: twilioFrom,
        to: `whatsapp:${normalizedPhone}`,
        body: `✅ Commande CupiDog confirmée !\nRéf: ${orderId}\nTotal: ₪${Number(amount).toFixed(0)}\nVous serez livré à ${addressLine}`,
      });
      console.log(`📱 WhatsApp client envoyé à ${normalizedPhone}`);
    } catch (smsErr) {
      console.error("❌ Erreur WhatsApp Twilio:", smsErr.message);
    }
  }

  // Push notifications vendeurs
  try {
    const orderSnap = await db.collection("marketplace_orders").doc(orderId).get();
    const orderItems = orderSnap.exists ? (orderSnap.data().items || []) : [];
    const sellerIds = [...new Set(orderItems.map(i => i.sellerId).filter(Boolean))];

    await Promise.all(sellerIds.map(async (sellerId) => {
      try {
        const [sellerDoc, sellerProDoc] = await Promise.all([
          db.collection("users").doc(sellerId).get(),
          db.collection("professional_accounts").doc(sellerId).get(),
        ]);
        const sellerData = sellerDoc.data() || {};
        const sellerProData = sellerProDoc.data() || {};
        const sellerItems = orderItems.filter(i => i.sellerId === sellerId);
        const sellerTotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Push notification (seulement si pushToken présent)
        const pushToken = sellerData.pushToken;
        if (pushToken) {
          const body = sellerItems.length === 1
            ? `${sellerItems[0].productName} x${sellerItems[0].quantity} — ₪${sellerTotal.toFixed(0)}`
            : `${sellerItems.length} articles — ₪${sellerTotal.toFixed(0)}`;
          await admin.messaging().send({
            token: pushToken,
            notification: { title: "🛒 Nouvelle commande !", body },
            data: { type: "new_order", orderId },
          });
        }

        // Email vendeur — priorité : professional_accounts, fallback : users
        const sellerEmail = sellerProData.email || sellerData.email;
        if (sellerEmail && gmailEmail) {
          const itemsHtml = sellerItems
            .map(i => `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.productName}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₪${(i.price * i.quantity).toFixed(0)}</td>
            </tr>`)
            .join("");
          const addressHtml = shippingAddress
            ? `${shippingAddress.street || ""}, ${shippingAddress.city || ""}${shippingAddress.zip ? " " + shippingAddress.zip : ""}`
            : "Non renseignée";

          await transporter.sendMail({
            from: "CupiDog <" + gmailEmail + ">",
            to: sellerEmail,
            subject: `🛒 Nouvelle commande CupiDog - ${orderId}`,
            html: `
              <div style="font-family:sans-serif;line-height:1.6;max-width:560px;">
                <h1 style="color:#FF6B6B;">🛒 Nouvelle commande !</h1>
                <p>Bonjour,</p>
                <p>Vous avez reçu une nouvelle commande sur <strong>CupiDog</strong>.</p>
                <p><strong>Référence :</strong> ${orderId}</p>
                <h3 style="margin-bottom:4px;">Produits commandés</h3>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <thead>
                    <tr style="background:#f5f5f5;">
                      <th style="padding:6px 8px;text-align:left;">Produit</th>
                      <th style="padding:6px 8px;">Qté</th>
                      <th style="padding:6px 8px;text-align:right;">Montant</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding:8px;font-weight:bold;">Total</td>
                      <td style="padding:8px;font-weight:bold;text-align:right;">₪${sellerTotal.toFixed(0)}</td>
                    </tr>
                  </tfoot>
                </table>
                <hr style="margin:16px 0;">
                <h3 style="margin-bottom:4px;">Adresse de livraison</h3>
                <p style="margin:0;">${addressHtml}</p>
                <h3 style="margin-bottom:4px;margin-top:16px;">Coordonnées client</h3>
                <p style="margin:0;"><strong>Nom :</strong> ${customerName || "Non renseigné"}</p>
                <p style="margin:0;"><strong>Téléphone :</strong> ${customerPhone || "Non renseigné"}</p>
                <hr style="margin:16px 0;">
                <p><em>Email envoyé automatiquement par CupiDog</em></p>
              </div>
            `,
          });
          console.log(`📧 Email vendeur envoyé à ${sellerEmail}`);
        }
      } catch (sellerErr) {
        console.error(`❌ Erreur notification vendeur ${sellerId}:`, sellerErr.message);
      }
    }));
  } catch (notifErr) {
    console.error("❌ Erreur notifications vendeurs:", notifErr.message);
  }

  // Email de confirmation client
  if (customerEmail && gmailEmail) {
    try {
      const allItemsHtml = Array.isArray(items)
        ? items.map(i => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.productName}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₪${(i.price * i.quantity).toFixed(0)}</td>
          </tr>`).join("")
        : "";

      await transporter.sendMail({
        from: "CupiDog <" + gmailEmail + ">",
        to: customerEmail,
        subject: "✅ Votre commande CupiDog est confirmée !",
        html: `
          <div style="font-family:sans-serif;line-height:1.6;max-width:560px;">
            <h1 style="color:#FF6B6B;">✅ Commande confirmée !</h1>
            <p>Bonjour <strong>${customerName || ""}</strong>,</p>
            <p>Merci pour votre commande sur <strong>CupiDog</strong>. Elle a bien été enregistrée et sera traitée dans les plus brefs délais.</p>
            <p><strong>Numéro de commande :</strong> ${orderId}</p>
            <h3 style="margin-bottom:4px;">Récapitulatif</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:6px 8px;text-align:left;">Produit</th>
                  <th style="padding:6px 8px;">Qté</th>
                  <th style="padding:6px 8px;text-align:right;">Montant</th>
                </tr>
              </thead>
              <tbody>${allItemsHtml}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:8px;font-weight:bold;">Total payé</td>
                  <td style="padding:8px;font-weight:bold;text-align:right;">₪${Number(amount).toFixed(0)}</td>
                </tr>
              </tfoot>
            </table>
            <hr style="margin:16px 0;">
            <h3 style="margin-bottom:4px;">Adresse de livraison</h3>
            <p style="margin:0;">${addressLine}</p>
            <br>
            <p>À très vite,</p>
            <p>L'équipe CupiDog 🐾</p>
            <hr style="margin:16px 0;">
            <p><em>Email envoyé automatiquement par CupiDog</em></p>
          </div>
        `,
      });
      console.log(`📧 Email confirmation client envoyé à ${customerEmail}`);
    } catch (emailErr) {
      console.error("❌ Erreur email client:", emailErr.message);
    }
  }

  return { success: true, orderId, confirmation };
});

// ========================================
// FUNCTION 7 : Génération des factures mensuelles
// ========================================
exports.generateMonthlyInvoices = functions.pubsub
  .schedule('0 0 1 * *')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const proSnapshot = await db.collection('professional_accounts').where('status', '==', 'approved').get();
      const proDocs = proSnapshot.docs.filter(doc => {
        const data = doc.data() || {};
        const activityType = (data.activityType || '').toLowerCase();
        return activityType === 'service_provider' || activityType === 'seller' || activityType === 'vendeur';
      });

      for (const proDoc of proDocs) {
        const proId = proDoc.id;
        const proData = proDoc.data() || {};
        const email = proData.email || '';
        const companyName = proData.companyName || 'Professionnel';
        const activityType = (proData.activityType || '').toLowerCase();

        if (activityType === 'service_provider') {
          const leadsQuery = await db.collection('marketplace_leads')
            .where('providerId', '==', proId)
            .where('createdAt', '>=', start)
            .where('createdAt', '<', end)
            .get();

          const leadItems = leadsQuery.docs.map(leadDoc => {
            const lead = leadDoc.data() || {};
            return {
              leadId: leadDoc.id,
              customerName: lead.customerName || 'Client',
              date: lead.createdAt?.toDate ? lead.createdAt.toDate() : null,
              amount: Number(lead.leadPrice || 0),
            };
          });

          const subtotal = leadItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const monthlyPlanAmount = (proData.subscriptionPlan === 'pro_plus' || proData.subscriptionPlan === 'pro+') ? 299 : (proData.subscriptionPlan === 'pro' ? 159 : 0);
          const totalHt = subtotal + monthlyPlanAmount;

          const invoiceNumber = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${proId.slice(-6)}`;

          const invoiceRef = db.collection('invoices').doc();
          await invoiceRef.set({
            userId: proId,
            documentType: 'קבלה',
            type: 'monthly_pro_invoice',
            invoiceNumber,
            providerId: proId,
            providerName: companyName,
            periodStart: start,
            periodEnd: end,
            leadCount: leadItems.length,
            leadItems,
            leadsSubtotal: subtotal,
            subscriptionPlan: proData.subscriptionPlan || 'freemium',
            subscriptionAmount: monthlyPlanAmount,
            total: totalHt,
            currency: 'ILS',
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (email && gmailEmail) {
            const leadsHtml = leadItems.length > 0
              ? leadItems.map(item => `
                <tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.customerName}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.date ? item.date.toLocaleDateString('fr-FR') : 'N/A'}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₪${Number(item.amount).toFixed(0)}</td>
                </tr>`).join('')
              : '<tr><td colspan="3" style="padding:8px;">Aucun lead ce mois-ci</td></tr>';

            await transporter.sendMail({
              from: 'CupiDog <' + gmailEmail + '>',
              to: email,
              subject: `🧾 קבלה חודשית CupiDog - ${invoiceNumber}`,
              html: `
                <div style="font-family:sans-serif;line-height:1.6;max-width:600px;">
                  <h2 style="color:#FF6B6B;">קבלה חודשית CupiDog</h2>
                  <p>Bonjour <strong>${companyName}</strong>,</p>
                  <p>Votre reçu mensuel pour le mois écoulé a été généré.</p>
                  <p><strong>Numéro :</strong> ${invoiceNumber}</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
                    <thead>
                      <tr style="background:#f5f5f5;">
                        <th style="padding:6px 8px;text-align:left;">Client</th>
                        <th style="padding:6px 8px;text-align:left;">Date</th>
                        <th style="padding:6px 8px;text-align:right;">Montant</th>
                      </tr>
                    </thead>
                    <tbody>${leadsHtml}</tbody>
                  </table>
                  <p style="margin-top:12px;"><strong>Abonnement :</strong> ₪${monthlyPlanAmount.toFixed(0)}</p>
                  <p><strong>TVA :</strong> 0%</p>
                  <p><strong>Total HT :</strong> ₪${totalHt.toFixed(0)}</p>
                  <hr style="margin:16px 0;">
                  <p><strong>Nom :</strong> Eliyahou Bialik</p>
                  <p><strong>ת.ז :</strong> (à renseigner)</p>
                  <p><strong>פטור ממע"מ - עוסק פטור</strong></p>
                  <p><em>Email envoyé automatiquement par CupiDog</em></p>
                </div>
              `,
            });
          }
        }

        if (activityType === 'seller' || activityType === 'vendeur') {
          const ordersSnapshot = await db.collection('marketplace_orders').get();
          const sales = [];
          let totalSales = 0;

          ordersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data() || {};
            const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : null;
            if (!createdAt || createdAt < start || createdAt >= end) return;
            if (!Array.isArray(order.items)) return;

            order.items.forEach(item => {
              if (item.sellerId !== proId) return;
              const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
              const commission = itemTotal * 0.15;
              sales.push({
                orderId: orderDoc.id,
                productName: item.productName || 'Produit',
                quantity: item.quantity || 0,
                total: itemTotal,
                commission,
              });
              totalSales += itemTotal;
            });
          });

          const commissionTotal = totalSales * 0.15;
          const totalHt = commissionTotal;
          const invoiceNumber = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${proId.slice(-6)}`;

          const invoiceRef = db.collection('invoices').doc();
          await invoiceRef.set({
            userId: proId,
            documentType: 'קבלה',
            type: 'monthly_seller_invoice',
            invoiceNumber,
            sellerId: proId,
            sellerName: companyName,
            periodStart: start,
            periodEnd: end,
            sales,
            salesTotal: totalSales,
            commissionRate: 0.15,
            commissionAmount: commissionTotal,
            total: totalHt,
            currency: 'ILS',
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (email && gmailEmail) {
            const salesHtml = sales.length > 0
              ? sales.map(item => `
                <tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.productName}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₪${Number(item.total).toFixed(0)}</td>
                </tr>`).join('')
              : '<tr><td colspan="3" style="padding:8px;">Aucune vente ce mois-ci</td></tr>';

            await transporter.sendMail({
              from: 'CupiDog <' + gmailEmail + '>',
              to: email,
              subject: `🧾 קבלה חודשית vendeur CupiDog - ${invoiceNumber}`,
              html: `
                <div style="font-family:sans-serif;line-height:1.6;max-width:600px;">
                  <h2 style="color:#FF6B6B;">קבלה חודשית vendeur CupiDog</h2>
                  <p>Bonjour <strong>${companyName}</strong>,</p>
                  <p>Votre reçu mensuel de vente a été généré.</p>
                  <p><strong>Numéro :</strong> ${invoiceNumber}</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
                    <thead>
                      <tr style="background:#f5f5f5;">
                        <th style="padding:6px 8px;text-align:left;">Produit</th>
                        <th style="padding:6px 8px;text-align:center;">Qté</th>
                        <th style="padding:6px 8px;text-align:right;">Montant</th>
                      </tr>
                    </thead>
                    <tbody>${salesHtml}</tbody>
                  </table>
                  <p style="margin-top:12px;"><strong>Commission CupiDog 15% :</strong> ₪${commissionTotal.toFixed(0)}</p>
                  <p><strong>TVA :</strong> 0%</p>
                  <p><strong>Total HT :</strong> ₪${totalHt.toFixed(0)}</p>
                  <hr style="margin:16px 0;">
                  <p><strong>Nom :</strong> Eliyahou Bialik</p>
                  <p><strong>ת.ז :</strong> (à renseigner)</p>
                  <p><strong>פטור ממע"מ - עוסק פטור</strong></p>
                  <p><em>Email envoyé automatiquement par CupiDog</em></p>
                </div>
              `,
            });
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur generateMonthlyInvoices:', error);
      return null;
    }
  });

// ========================================
// FUNCTION 8 : Vérifier abonnements (24h)
// ========================================
exports.checkExpiringSubscriptions = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const profilesSnap = await admin.firestore().collection('profiles').get();
      const notifications = [];

      for (const profileDoc of profilesSnap.docs) {
        const profileData = profileDoc.data();
        if (profileData.abonnement && profileData.abonnement !== 'gratuit') {
          const expirationDate = profileData.subscriptionEndDate?.toDate();
          if (expirationDate && expirationDate <= threeDaysFromNow && expirationDate > new Date()) {
            const userDoc = await admin.firestore().collection('users').doc(profileData.uid).get();
            const pushToken = userDoc.data()?.pushToken;
            if (pushToken) {
              const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
              notifications.push(admin.messaging().send({
                token: pushToken,
                notification: { title: '⏰ Abonnement', body: `Plus que ${daysLeft} jour(s) restants.` },
                data: { type: 'subscription_expiring', daysLeft: daysLeft.toString() }
              }));
            }
          }
        }
      }
      await Promise.all(notifications);
      return null;
    } catch (error) {
      console.error('❌ Erreur abonnements:', error);
      return null;
    }
  });
