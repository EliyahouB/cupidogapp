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

exports.findNearbyParks = functions
  .runWith({ secrets: ["GOOGLE_MAPS_API_KEY"] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in to search nearby parks.");
    }

    const latitude = data?.latitude;
    const longitude = data?.longitude;
    const radiusMeters = data?.radiusMeters;
    const allowedRadii = [1000, 2000, 5000, 10000];

    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !allowedRadii.includes(radiusMeters)
    ) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid location or search radius.");
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Google Places is not configured.");
    }

    try {
      const response = await axios.post(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          includedTypes: [
            "park",
            "dog_park",
            "city_park",
            "state_park",
            "national_park",
            "garden",
            "botanical_garden",
            "picnic_ground",
          ],
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: radiusMeters,
            },
          },
          languageCode: ["fr", "en", "he", "ru"].includes(data?.languageCode)
            ? data.languageCode
            : "fr",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.googleMapsUri",
          },
          timeout: 15000,
        }
      );

      return (response.data.places || [])
        .filter((place) => place.id && place.location && place.displayName?.text)
        .map((place) => ({
          id: place.id,
          name: place.displayName.text,
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`,
        }));
    } catch (error) {
      console.error("Google Places nearby search failed:", error.response?.data || error.message);
      throw new functions.https.HttpsError("unavailable", "Nearby parks could not be loaded.");
    }
  });

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
// OUTILS COMMUNS : échappement, masquage, alertes admin
// ========================================
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Texte brut sûr (WhatsApp, push) : sans caractères de contrôle, longueur limitée
function cleanText(value, maxLength = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const EMAIL_REGEX = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

// Numéro au format +XXXXXXXX (8 à 15 chiffres), sinon null
function normalizePhone(raw) {
  let phone = String(raw || "").replace(/[\s\-().]/g, "");
  if (!phone) return null;
  if (!phone.startsWith("+")) phone = "+972" + phone.replace(/^0/, "");
  phone = phone.replace(/^\+9720/, "+972");
  return /^\+\d{8,15}$/.test(phone) ? phone : null;
}

function maskPhone(phone) {
  const p = String(phone || "");
  return p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : "•••";
}

const roundMoney = (n) => Math.round(Number(n) * 100) / 100;

// E-mail d'alerte à l'admin (jamais de coordonnées client dans "lines")
async function sendAdminAlert(subject, lines) {
  if (!gmailEmail) return;
  try {
    await transporter.sendMail({
      from: "CupiDog <" + gmailEmail + ">",
      to: gmailEmail,
      subject,
      html: `<div style="font-family:sans-serif;line-height:1.6;">${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>`,
    });
  } catch (err) {
    console.error("Erreur envoi alerte admin:", err.message);
  }
}

// ========================================
// TABLES DES PRIX (abonnements et boosts) — source officielle, côté serveur
// ========================================
const SUBSCRIPTION_PLANS = {
  vente: 99,
  saillie: 149,
  essentiel: 249,
  premium: 399,
  pro: 159,
  pro_plus: 299,
};
const PLAN_ALIASES = { "pro+": "pro_plus" };

const BOOSTS = {
  boost_3days: { price: 59, days: 3 },
  boost_7days: { price: 99, days: 7 },
  boost_stud: { price: 99, priceSubscribed: 49, days: 7 },
  boost_sale: { price: 69, priceSubscribed: 39, days: 7 },
};
// Abonnements donnant droit au tarif boost réduit (même liste que Abonnements.js hasSubscription)
const BOOST_SUBSCRIBER_PLANS = ["essentiel", "premium", "pro", "pro_plus", "freemium"];

// Ancienne version de l'app : elle envoie le libellé traduit du boost dans "plan".
// Ces libellés viennent de locales/{fr,en,he,ru}.js (boost_3days, boost_7days, "Boost " + stud / sale).
const LEGACY_BOOST_LABELS = {
  "Boost 3 jours": "boost_3days",
  "3-day Boost": "boost_3days",
  "בוסט 3 ימים": "boost_3days",
  "Буст на 3 дня": "boost_3days",
  "Boost 7 jours": "boost_7days",
  "7-day Boost": "boost_7days",
  "בוסט 7 ימים": "boost_7days",
  "Буст на 7 дней": "boost_7days",
  "Boost Saillie": "boost_stud",
  "Boost Stud": "boost_stud",
  "Boost הרבעה": "boost_stud",
  "Boost Вязка": "boost_stud",
  "Boost Vente": "boost_sale",
  "Boost Sale": "boost_sale",
  "Boost מכירה": "boost_sale",
  "Boost Продажа": "boost_sale",
};

// ========================================
// FUNCTION 6 : Paiement Tranzila + mise à jour Firestore
// ========================================
exports.processPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { plan, price, cardNumber, expiryDate, cvv, boostId: rawBoostId } = data || {};

  if ((!plan && !rawBoostId) || price === undefined || price === null || !cardNumber || !expiryDate || !cvv) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields");
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  // 1. Identifier l'achat : boost (identifiant fixe ou ancien libellé traduit) ou abonnement
  let boostId = null;
  let planId = null;
  if (rawBoostId !== undefined && rawBoostId !== null) {
    boostId = String(rawBoostId);
    if (!BOOSTS[boostId]) {
      throw new functions.https.HttpsError("invalid-argument", "unknown_boost");
    }
  } else if (LEGACY_BOOST_LABELS[String(plan).trim()]) {
    boostId = LEGACY_BOOST_LABELS[String(plan).trim()];
  } else {
    const normalized = String(plan).trim().toLowerCase();
    planId = PLAN_ALIASES[normalized] || normalized;
    if (!Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, planId)) {
      throw new functions.https.HttpsError("invalid-argument", "unknown_plan");
    }
  }

  // 2. Prix fixé par le serveur (jamais celui envoyé par l'app)
  let serverPrice;
  if (boostId) {
    const boost = BOOSTS[boostId];
    serverPrice = boost.price;
    if (boost.priceSubscribed !== undefined) {
      const profileSnap = await db.collection("profiles").doc(userId).get();
      const currentPlan = profileSnap.exists ? (profileSnap.data().abonnement || "") : "";
      if (BOOST_SUBSCRIBER_PLANS.includes(currentPlan)) serverPrice = boost.priceSubscribed;
    }
  } else {
    serverPrice = SUBSCRIPTION_PLANS[planId];
  }

  // Ne jamais débiter plus que le prix affiché au client
  const displayedPrice = Number(price);
  if (!Number.isFinite(displayedPrice) || displayedPrice + 0.005 < serverPrice) {
    throw new functions.https.HttpsError("failed-precondition", "price_changed");
  }

  const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
  const ccno = String(cardNumber).replace(/\s/g, "");
  const expdate = String(expiryDate).replace("/", ""); // MM/YY → MMYY

  const params = new URLSearchParams({
    supplier: "cupidog",
    TranzilaTK: "cupidogtok",
    apikey: tranzilaPrivateKey,
    sum: String(serverPrice),
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

  const responseCode = tranzilaData.Response || tranzilaData.response;
  // Seul le code de réponse est journalisé (jamais la réponse complète de Tranzila)
  console.log(`Tranzila processPayment : code ${responseCode}`);
  if (responseCode !== "000") {
    throw new functions.https.HttpsError("aborted", `payment_declined:${responseCode}`);
  }

  const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";

  // 3a. Boost : enregistré dans "boosts", jamais dans profiles.abonnement
  if (boostId) {
    const boost = BOOSTS[boostId];
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + boost.days * 24 * 60 * 60 * 1000);
    await Promise.all([
      db.collection("boosts").add({
        userId,
        boostId,
        price: serverPrice,
        durationDays: boost.days,
        startsAt,
        endsAt,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: "card",
        lastFourDigits: ccno.slice(-4),
        tranzilaConfirmation: confirmation,
      }),
      db.collection("invoices").add({
        userId,
        type: "boost",
        boostId,
        amount: serverPrice,
        status: "paid",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        tranzilaConfirmation: confirmation,
      }),
    ]);
    return { success: true, confirmation, type: "boost", boostId, amount: serverPrice };
  }

  // 3b. Abonnement
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await Promise.all([
    db.collection("subscriptions").add({
      userId,
      plan: planId,
      price: serverPrice,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionEndDate: expiresAt,
      autoRenew: true,
      paymentMethod: "card",
      lastFourDigits: ccno.slice(-4),
      tranzilaConfirmation: confirmation,
    }),
    db.collection("profiles").doc(userId).update({
      abonnement: planId,
      subscriptionEndDate: expiresAt,
    }),
    db.collection("invoices").add({
      userId,
      type: "subscription",
      plan: planId,
      amount: serverPrice,
      status: "paid",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      tranzilaConfirmation: confirmation,
    }),
  ]);

  return { success: true, confirmation, type: "subscription", plan: planId, amount: serverPrice };
});

// ========================================
// GRILLE DES PRIX DES LEADS (source officielle, côté serveur)
// Le prix envoyé par l'app (leadData.leadPrice) n'est jamais utilisé pour débiter.
// ========================================
const LEAD_PRICES = {
  veterinaire: { pro: 45, pro_plus: 34 },
  toiletteur: { pro: 35, pro_plus: 26 },
  educateur: { pro: 35, pro_plus: 26 },
  pension: { pro: 30, pro_plus: 22 },
  dogwalker: { pro: 25, pro_plus: 19 },
  assurance: { pro: 50, pro_plus: 38 },
  transport: { pro: 25, pro_plus: 19 },
  photographe: { pro: 35, pro_plus: 26 },
};
const DECOUVERTE_LEAD_PRICE = 65;

// Ramène l'offre enregistrée à "decouverte", "pro" ou "pro_plus".
// Offre absente ou inconnue => Découverte.
function normalizeProPlan(rawPlan) {
  const plan = String(rawPlan || "").toLowerCase().trim();
  if (plan === "pro") return "pro";
  if (plan === "pro+" || plan === "pro_plus") return "pro_plus";
  if (plan && plan !== "decouverte") {
    console.warn(`Offre pro inconnue "${plan}", tarif Découverte appliqué`);
  }
  return "decouverte";
}

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
      const db = admin.firestore();

      if (!providerId) {
        console.warn("Lead sans providerId, débit ignoré");
        return null;
      }

      // Verrou anti-double débit : un déclencheur peut être exécuté plusieurs fois.
      // Collection absente des règles Firestore => inaccessible depuis l'app.
      const lockRef = db.collection("lead_charges").doc(leadId);
      const lockAcquired = await db.runTransaction(async (tx) => {
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists) return false;
        tx.set(lockRef, {
          providerId,
          status: "processing",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
      });
      if (!lockAcquired) {
        console.log(`Lead ${leadId} déjà traité, débit ignoré`);
        return null;
      }

      const providerDoc = await db.collection("professional_accounts").doc(providerId).get();
      if (!providerDoc.exists) {
        console.warn(`Compte pro introuvable pour le lead ${leadId}`);
        await lockRef.update({ status: "skipped", reason: "no_pro_account" });
        return null;
      }

      const providerData = providerDoc.data() || {};
      const plan = normalizeProPlan(providerData.subscriptionPlan);

      // Catégorie lue dans le service (jamais dans le lead) ;
      // le service doit appartenir au pro facturé.
      let category = "";
      let failureReason = null;
      const serviceId = leadData.serviceId;
      if (!serviceId) {
        failureReason = "missing_service_id";
      } else {
        const serviceDoc = await db.collection("marketplace_services").doc(String(serviceId)).get();
        if (!serviceDoc.exists) {
          failureReason = "service_not_found";
        } else {
          const serviceData = serviceDoc.data() || {};
          category = String(serviceData.category || "").toLowerCase();
          if (serviceData.providerId !== providerId) {
            failureReason = "service_provider_mismatch";
          } else if (!LEAD_PRICES[category]) {
            failureReason = "unknown_category";
          }
        }
      }

      const amount = failureReason
        ? 0
        : (plan === "decouverte" ? DECOUVERTE_LEAD_PRICE : LEAD_PRICES[category][plan]);

      const invoiceRef = db.collection("invoices").doc(`lead_${leadId}`);
      const invoiceData = {
        userId: providerId,
        type: "lead",
        leadId,
        serviceId: serviceId || null,
        serviceCategory: category || "unknown",
        plan,
        amount,
        currency: "ILS",
        status: "pending_payment",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await invoiceRef.set(invoiceData);

      if (failureReason) {
        console.error(`Lead ${leadId} non débité : ${failureReason}`);
        await Promise.all([
          invoiceRef.update({ status: "failed", failureReason }),
          db.collection("marketplace_leads").doc(leadId).update({
            paymentStatus: "failed",
            invoiceId: invoiceRef.id,
          }),
          lockRef.update({ status: "failed", reason: failureReason }),
        ]);
        return null;
      }

      if (!providerData.tranzilaToken) {
        await db.collection("marketplace_leads").doc(leadId).update({
          paymentStatus: "pending_token",
          invoiceId: invoiceRef.id,
        });
        await lockRef.update({ status: "pending_token", amount });

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
        await lockRef.update({ status: "failed", reason: "missing_tranzila_key" });
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
          await lockRef.update({ status: "failed", reason: "tranzila_request_error" });
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
        await lockRef.update({ status: "failed", reason: `tranzila_${responseCode}` });
        return null;
      }

      const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";
      await Promise.all([
        lockRef.update({
          status: "paid",
          amount,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
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
// Sécurité (C6) : commande vérifiée AVANT le débit, montant recalculé depuis
// marketplace_products, verrou anti-double débit, commission 15 % côté serveur,
// stock et compteur "sold" mis à jour dans la même transaction que le passage en "paid".
// ========================================
const MARKETPLACE_COMMISSION_RATE = 0.15;

exports.processMarketplacePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  // Champs encore envoyés par l'app (items, customerPhone, customerName, customerEmail,
  // shippingAddress) : acceptés pour compatibilité, mais jamais utilisés pour le débit
  // ni pour les envois. Seules les données de la commande en base font foi.
  const { orderId, amount, cardNumber, expiryDate, cvv } = data || {};

  if (!orderId || !cardNumber || !expiryDate || !cvv) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const orderRef = db.collection("marketplace_orders").doc(String(orderId));

  // 1. Vérification de la commande + recalcul du montant + verrou (une seule transaction)
  const verified = await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new functions.https.HttpsError("not-found", "order_not_found");
    }
    const order = orderSnap.data() || {};
    if (order.customerId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "order_not_owned");
    }
    if (order.status !== "pending") {
      throw new functions.https.HttpsError("failed-precondition", "order_not_pending");
    }

    const submittedItems = Array.isArray(order.items) ? order.items : [];
    if (submittedItems.length === 0 || submittedItems.length > 50) {
      throw new functions.https.HttpsError("invalid-argument", "order_empty");
    }

    // Quantités par produit (un même produit peut apparaître deux fois)
    const qtyByProduct = {};
    for (const item of submittedItems) {
      const productId = typeof item.productId === "string" ? item.productId.trim() : "";
      const quantity = Number(item.quantity);
      if (!productId || productId.includes("/")) {
        throw new functions.https.HttpsError("invalid-argument", "invalid_product");
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new functions.https.HttpsError("invalid-argument", "invalid_quantity");
      }
      qtyByProduct[productId] = (qtyByProduct[productId] || 0) + quantity;
    }

    const productIds = Object.keys(qtyByProduct);
    const productSnaps = await tx.getAll(...productIds.map((id) => db.collection("marketplace_products").doc(id)));
    const products = {};
    productSnaps.forEach((snap) => {
      if (snap.exists) products[snap.id] = snap.data() || {};
    });

    for (const productId of productIds) {
      const product = products[productId];
      const unitPrice = product ? Number(product.price) : NaN;
      if (!product || product.status !== "active" || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new functions.https.HttpsError("failed-precondition", "product_unavailable");
      }
      if (typeof product.stock === "number" && qtyByProduct[productId] > product.stock) {
        throw new functions.https.HttpsError("failed-precondition", "out_of_stock");
      }
    }

    // Articles recalculés : prix, nom et vendeur lus en base
    const items = submittedItems.map((item) => {
      const productId = item.productId.trim();
      const product = products[productId];
      const unitPrice = roundMoney(product.price);
      const commission = roundMoney(unitPrice * MARKETPLACE_COMMISSION_RATE);
      return {
        productId,
        sellerId: product.sellerId || null,
        sellerName: cleanText(product.sellerName || item.sellerName || "", 80) || null,
        productName: cleanText(product.name || item.productName || "", 120),
        price: unitPrice,
        quantity: Number(item.quantity),
        commission,
        sellerPayout: roundMoney(unitPrice - commission),
      };
    });

    const total = roundMoney(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
    const totalCommission = roundMoney(items.reduce((sum, i) => sum + i.commission * i.quantity, 0));
    if (!(total > 0)) {
      throw new functions.https.HttpsError("failed-precondition", "invalid_total");
    }

    // Ne jamais débiter plus que le montant affiché au client
    const displayedAmount = amount === undefined || amount === null ? null : Number(amount);
    if (displayedAmount !== null && (!Number.isFinite(displayedAmount) || displayedAmount + 0.005 < total)) {
      throw new functions.https.HttpsError("failed-precondition", "price_changed");
    }

    tx.update(orderRef, {
      status: "payment_processing",
      paymentAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { order, items, total, totalCommission, displayedAmount, qtyByProduct };
  });

  // Remet la commande en "pending" pour permettre un nouvel essai (refus certain de Tranzila)
  const releaseOrder = async (reason) => {
    await orderRef.update({
      status: "pending",
      lastPaymentError: reason,
      lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  };

  const tranzilaPrivateKey = process.env.TRANZILA_PRIVATE_KEY;
  if (!tranzilaPrivateKey && process.env.TRANZILA_TEST_MODE !== "true") {
    await releaseOrder("missing_tranzila_key");
    throw new functions.https.HttpsError("failed-precondition", "payment_not_configured");
  }

  const ccno = String(cardNumber).replace(/\s/g, "");
  const expdate = String(expiryDate).replace("/", "");

  const params = new URLSearchParams({
    supplier: "cupidog",
    TranzilaTK: "cupidogtok",
    apikey: tranzilaPrivateKey || "",
    sum: String(verified.total),
    currency: "1",
    ccno,
    expdate,
    mycvv: cvv,
    cred_type: "1",
    tranmode: "V",
    response_return_format: "json",
  });

  // 2. Débit du montant recalculé
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
      // On ne sait pas si le débit a eu lieu : la commande reste en "payment_processing"
      // (pas de nouvel essai possible => pas de double débit) et l'admin est prévenu.
      console.error(`Tranzila HTTP error (commande ${orderId}):`, err.message);
      await orderRef.update({ paymentError: "gateway_unreachable" }).catch(() => {});
      await sendAdminAlert("⚠️ CupiDog : commande bloquée (Tranzila injoignable)", [
        `Commande : ${orderId}`,
        `Montant : ₪${verified.total}`,
        "Tranzila n'a pas répondu : vérifier dans l'interface Tranzila si le débit a eu lieu, puis passer la commande en 'paid' ou la remettre en 'pending'.",
      ]);
      throw new functions.https.HttpsError("unavailable", "Payment gateway unreachable");
    }
  }

  const responseCode = tranzilaData.Response || tranzilaData.response;
  console.log(`Tranzila marketplace (commande ${orderId}) : code ${responseCode}`);
  if (responseCode !== "000") {
    await releaseOrder(`declined_${responseCode}`);
    throw new functions.https.HttpsError("aborted", `payment_declined:${responseCode}`);
  }

  const confirmation = tranzilaData.ConfirmationCode || tranzilaData.Confirmationcode || "";

  // 3. Passage en "paid" + stock + compteur "sold" dans la même transaction
  let stockConflict = false;
  try {
    await db.runTransaction(async (tx) => {
      stockConflict = false; // une transaction peut être rejouée
      const orderSnap = await tx.get(orderRef);
      const current = orderSnap.exists ? orderSnap.data() || {} : {};
      if (current.status !== "payment_processing") {
        throw new Error(`statut inattendu : ${current.status}`);
      }

      const productIds = Object.keys(verified.qtyByProduct);
      const productRefs = productIds.map((id) => db.collection("marketplace_products").doc(id));
      const productSnaps = await tx.getAll(...productRefs);

      productSnaps.forEach((snap, index) => {
        if (!snap.exists) return;
        const product = snap.data() || {};
        const quantity = verified.qtyByProduct[productIds[index]];
        const update = {
          sold: admin.firestore.FieldValue.increment(quantity),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (typeof product.stock === "number") {
          if (product.stock < quantity) stockConflict = true;
          const newStock = Math.max(0, product.stock - quantity);
          update.stock = newStock;
          if (newStock === 0) update.status = "out_of_stock";
        }
        tx.update(productRefs[index], update);
      });

      tx.update(orderRef, {
        status: "paid",
        paymentMethod: "credit_card",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        tranzilaConfirmation: confirmation,
        lastFourDigits: ccno.slice(-4),
        amountCharged: verified.total,
        amountDisplayed: verified.displayedAmount,
        itemsAsSubmitted: verified.order.items || [],
        items: verified.items,
        subtotal: verified.total,
        total: verified.total,
        totalCommission: verified.totalCommission,
        commissionRate: MARKETPLACE_COMMISSION_RATE,
        sellerIds: [...new Set(verified.items.map((i) => i.sellerId).filter(Boolean))],
        stockConflict,
      });
    });
  } catch (err) {
    // Débit effectué mais commande non enregistrée : l'admin doit intervenir
    console.error(`❌ Commande ${orderId} débitée mais non enregistrée :`, err.message);
    await sendAdminAlert("🚨 CupiDog : commande débitée mais non enregistrée", [
      `Commande : ${orderId}`,
      `Montant débité : ₪${verified.total}`,
      `Confirmation Tranzila : ${confirmation}`,
      "La commande est restée en 'payment_processing'. À passer en 'paid' manuellement (stock à vérifier).",
    ]);
    return { success: true, orderId, confirmation, recorded: false };
  }

  if (stockConflict) {
    await sendAdminAlert("⚠️ CupiDog : stock insuffisant après paiement", [
      `Commande : ${orderId}`,
      "Le stock d'au moins un produit était inférieur à la quantité payée (stock mis à 0). À vérifier avec le vendeur.",
    ]);
  }

  // 4. Envois : uniquement aux coordonnées de la commande vérifiée, textes échappés
  const order = verified.order;
  const items = verified.items;
  const shipping = order.shippingAddress || {};
  const zip = shipping.postalCode || shipping.zip || "";
  const addressText = cleanText(
    [shipping.street, shipping.city].filter(Boolean).join(", ") + (zip ? " " + zip : ""),
    200
  ) || "Non renseignée";
  const customerName = cleanText(order.customerName || "", 80);
  const customerPhone = normalizePhone(order.customerPhone);
  const customerEmail = typeof order.customerEmail === "string" && EMAIL_REGEX.test(order.customerEmail.trim())
    ? order.customerEmail.trim()
    : null;

  const itemRowsHtml = (list) => list
    .map((i) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtml(i.productName)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₪${(i.price * i.quantity).toFixed(0)}</td>
    </tr>`)
    .join("");

  // WhatsApp de confirmation client via Twilio
  if (client && customerPhone) {
    try {
      const body = cleanText(
        `✅ Commande CupiDog confirmée ! Réf: ${orderId} — Total: ₪${verified.total.toFixed(0)} — Livraison : ${addressText}`,
        300
      );
      await client.messages.create({
        from: twilioFrom,
        to: `whatsapp:${customerPhone}`,
        body,
      });
      console.log(`📱 WhatsApp client envoyé (commande ${orderId}, ${maskPhone(customerPhone)})`);
    } catch (smsErr) {
      console.error(`❌ Erreur WhatsApp Twilio (commande ${orderId}):`, smsErr.message);
    }
  } else if (order.customerPhone) {
    console.warn(`Téléphone client invalide, WhatsApp non envoyé (commande ${orderId})`);
  }

  // Push notifications + e-mails vendeurs
  try {
    const sellerIds = [...new Set(items.map((i) => i.sellerId).filter(Boolean))];

    await Promise.all(sellerIds.map(async (sellerId) => {
      try {
        const [sellerDoc, sellerProDoc] = await Promise.all([
          db.collection("users").doc(sellerId).get(),
          db.collection("professional_accounts").doc(sellerId).get(),
        ]);
        const sellerData = sellerDoc.data() || {};
        const sellerProData = sellerProDoc.data() || {};
        const sellerItems = items.filter((i) => i.sellerId === sellerId);
        const sellerTotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Push notification (seulement si pushToken présent)
        const pushToken = sellerData.pushToken;
        if (pushToken) {
          const body = sellerItems.length === 1
            ? `${cleanText(sellerItems[0].productName, 60)} x${sellerItems[0].quantity} — ₪${sellerTotal.toFixed(0)}`
            : `${sellerItems.length} articles — ₪${sellerTotal.toFixed(0)}`;
          await admin.messaging().send({
            token: pushToken,
            notification: { title: "🛒 Nouvelle commande !", body },
            data: { type: "new_order", orderId: String(orderId) },
          });
        }

        // Email vendeur — priorité : professional_accounts, fallback : users
        const sellerEmail = sellerProData.email || sellerData.email;
        if (sellerEmail && gmailEmail && EMAIL_REGEX.test(String(sellerEmail).trim())) {
          await transporter.sendMail({
            from: "CupiDog <" + gmailEmail + ">",
            to: String(sellerEmail).trim(),
            subject: `🛒 Nouvelle commande CupiDog - ${orderId}`,
            html: `
              <div style="font-family:sans-serif;line-height:1.6;max-width:560px;">
                <h1 style="color:#FF6B6B;">🛒 Nouvelle commande !</h1>
                <p>Bonjour,</p>
                <p>Vous avez reçu une nouvelle commande sur <strong>CupiDog</strong>.</p>
                <p><strong>Référence :</strong> ${escapeHtml(orderId)}</p>
                <h3 style="margin-bottom:4px;">Produits commandés</h3>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <thead>
                    <tr style="background:#f5f5f5;">
                      <th style="padding:6px 8px;text-align:left;">Produit</th>
                      <th style="padding:6px 8px;">Qté</th>
                      <th style="padding:6px 8px;text-align:right;">Montant</th>
                    </tr>
                  </thead>
                  <tbody>${itemRowsHtml(sellerItems)}</tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding:8px;font-weight:bold;">Total</td>
                      <td style="padding:8px;font-weight:bold;text-align:right;">₪${sellerTotal.toFixed(0)}</td>
                    </tr>
                  </tfoot>
                </table>
                <hr style="margin:16px 0;">
                <h3 style="margin-bottom:4px;">Adresse de livraison</h3>
                <p style="margin:0;">${escapeHtml(addressText)}</p>
                <h3 style="margin-bottom:4px;margin-top:16px;">Coordonnées client</h3>
                <p style="margin:0;"><strong>Nom :</strong> ${escapeHtml(customerName || "Non renseigné")}</p>
                <p style="margin:0;"><strong>Téléphone :</strong> ${escapeHtml(customerPhone || "Non renseigné")}</p>
                <hr style="margin:16px 0;">
                <p><em>Email envoyé automatiquement par CupiDog</em></p>
              </div>
            `,
          });
          console.log(`📧 Email vendeur envoyé (commande ${orderId}, vendeur ${sellerId})`);
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
      await transporter.sendMail({
        from: "CupiDog <" + gmailEmail + ">",
        to: customerEmail,
        subject: "✅ Votre commande CupiDog est confirmée !",
        html: `
          <div style="font-family:sans-serif;line-height:1.6;max-width:560px;">
            <h1 style="color:#FF6B6B;">✅ Commande confirmée !</h1>
            <p>Bonjour <strong>${escapeHtml(customerName)}</strong>,</p>
            <p>Merci pour votre commande sur <strong>CupiDog</strong>. Elle a bien été enregistrée et sera traitée dans les plus brefs délais.</p>
            <p><strong>Numéro de commande :</strong> ${escapeHtml(orderId)}</p>
            <h3 style="margin-bottom:4px;">Récapitulatif</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:6px 8px;text-align:left;">Produit</th>
                  <th style="padding:6px 8px;">Qté</th>
                  <th style="padding:6px 8px;text-align:right;">Montant</th>
                </tr>
              </thead>
              <tbody>${itemRowsHtml(items)}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:8px;font-weight:bold;">Total payé</td>
                  <td style="padding:8px;font-weight:bold;text-align:right;">₪${verified.total.toFixed(0)}</td>
                </tr>
              </tfoot>
            </table>
            <hr style="margin:16px 0;">
            <h3 style="margin-bottom:4px;">Adresse de livraison</h3>
            <p style="margin:0;">${escapeHtml(addressText)}</p>
            <br>
            <p>À très vite,</p>
            <p>L'équipe CupiDog 🐾</p>
            <hr style="margin:16px 0;">
            <p><em>Email envoyé automatiquement par CupiDog</em></p>
          </div>
        `,
      });
      console.log(`📧 Email confirmation client envoyé (commande ${orderId})`);
    } catch (emailErr) {
      console.error(`❌ Erreur email client (commande ${orderId}):`, emailErr.message);
    }
  } else if (order.customerEmail) {
    console.warn(`E-mail client invalide, confirmation non envoyée (commande ${orderId})`);
  }

  return { success: true, orderId, confirmation, amount: verified.total };
});

// ========================================
// FUNCTION 7b : Alerte admin pour les commandes bloquées en "payment_processing"
// (plus de 15 minutes, par exemple si la fonction s'est arrêtée pendant le paiement)
// ========================================
exports.checkStuckMarketplaceOrders = functions.pubsub
  .schedule("every 30 minutes")
  .timeZone("Asia/Jerusalem")
  .onRun(async () => {
    try {
      const db = admin.firestore();
      const snap = await db.collection("marketplace_orders")
        .where("status", "==", "payment_processing")
        .get();

      const limit = Date.now() - 15 * 60 * 1000;
      const stuck = snap.docs.filter((d) => {
        const o = d.data() || {};
        const attempt = o.paymentAttemptAt?.toDate ? o.paymentAttemptAt.toDate().getTime() : 0;
        return attempt < limit && !o.stuckAlertSentAt;
      });

      if (stuck.length === 0) return null;

      await sendAdminAlert(`⚠️ CupiDog : ${stuck.length} commande(s) bloquée(s) en paiement`, [
        "Ces commandes sont en 'payment_processing' depuis plus de 15 minutes :",
        ...stuck.map((d) => {
          const o = d.data() || {};
          const attempt = o.paymentAttemptAt?.toDate ? o.paymentAttemptAt.toDate().toISOString() : "?";
          return `• ${d.id} — tentative : ${attempt}${o.paymentError ? " — " + o.paymentError : ""}`;
        }),
        "Vérifier dans l'interface Tranzila si le débit a eu lieu, puis passer la commande en 'paid' ou la remettre en 'pending'.",
      ]);

      await Promise.all(stuck.map((d) => d.ref.update({
        stuckAlertSentAt: admin.firestore.FieldValue.serverTimestamp(),
      })));
      return null;
    } catch (error) {
      console.error("❌ Erreur checkStuckMarketplaceOrders:", error.message);
      return null;
    }
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
              // Montant réellement débité ; leadPrice (envoyé par l'app) seulement pour les anciens leads
              amount: Number(lead.amountCharged ?? lead.leadPrice ?? 0),
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

// ========================================
// FUNCTION : Déplacement du justificatif hors de profiles (correction Storage 2b)
// L'ancienne version de l'app écrit profiles.legalDocumentUrl, lisible par tout
// utilisateur connecté. Le lien est copié dans un document privé, puis retiré du profil.
// - compte pro existant  => professional_accounts/{uid}.legalDocumentUrl
// - pas de compte pro    => professional_documents/{uid} (collection serveur, inaccessible
//   depuis l'app). On ne crée PAS professional_accounts ici : cela déclencherait
//   onNewProfessionalAccount et bloquerait la future inscription pro de l'ancienne version.
// ========================================
exports.onProfileLegalDoc = functions.firestore
  .document("profiles/{uid}")
  .onWrite(async (change, context) => {
    try {
      if (!change.after.exists) return null;
      const data = change.after.data() || {};
      const url = data.legalDocumentUrl;
      if (!url) return null;

      const uid = context.params.uid;
      const db = admin.firestore();
      const proRef = db.collection("professional_accounts").doc(uid);
      const docInfo = {
        legalDocumentUrl: url,
        legalDocumentVerified: data.legalDocumentVerified === true,
        legalDocumentMovedAt: admin.firestore.FieldValue.serverTimestamp(),
        legalDocumentActivityType: data.activityType || null,
      };

      const proSnap = await proRef.get();
      if (proSnap.exists) {
        await proRef.set(docInfo, { merge: true });
      } else {
        await db.collection("professional_documents").doc(uid).set(docInfo, { merge: true });
      }

      // Le lien est désormais conservé ailleurs : on le retire du profil public.
      await change.after.ref.update({
        legalDocumentUrl: admin.firestore.FieldValue.delete(),
      });

      console.log(`Justificatif de ${uid} déplacé hors de profiles (${proSnap.exists ? "professional_accounts" : "professional_documents"})`);
      return null;
    } catch (error) {
      console.error("❌ Erreur onProfileLegalDoc:", error);
      return null;
    }
  });
