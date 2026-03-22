const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");

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
      let senderName = profileQuery.empty ? 'Quelqu\'un' : profileQuery.docs[0].data().name;

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
      const userName = profileQuery.empty ? 'Quelqu\'un' : profileQuery.docs[0].data().name;

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

      const name1 = p1.empty ? 'Quelqu\'un' : p1.docs[0].data().name;
      const name2 = p2.empty ? 'Quelqu\'un' : p2.docs[0].data().name;

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
// FUNCTION 5 : Vérifier abonnements (24h)
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