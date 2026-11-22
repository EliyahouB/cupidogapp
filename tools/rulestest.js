// Test des règles Firestore SANS déploiement et SANS toucher aux données :
// simule des lectures/écritures avec l API Firebase Rules (comme le "Rules Playground").
// Utilise la connexion de "firebase login" déjà ouverte sur le poste (aucun mot de passe,
// aucune clé dans ce fichier). Lancer depuis la racine du projet : node tools/rulestest.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const G = path.join(execSync("npm root -g").toString().trim(), "firebase-tools", "lib") + path.sep;
const PROJECT_ID = JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".firebaserc"), "utf8")).projects.default;
const { Client } = require(G + "apiv2"); const auth = require(G + "auth");
const source = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
const P = (p) => "/databases/(default)/documents/" + p;
const U = "user_test_1", OTHER = "user_test_2", ADMIN = "pNoNYjpzYeW1rnQiStF0RYJSiVJ2";
const au = (uid, token = {}) => ({ uid, token: { sub: uid, ...token } });
const base = { uid: U, email: "x@test.dev", createdAt: "2026-01-01", userType: "particulier", name: "", city: "",
  bio: "", phone: "", hideProfile: false, nomadMode: true, emailVerified: false, onboardingCompleted: false,
  purpose: "", gender: "", abonnement: "gratuit", photoUrl: null, displayName: "" };
const existing = { ...base, onboardingCompleted: true, totalConversationsCreated: 5 };
const tc = (name, expectation, method, path, authObj, newData, oldData) => ({ name, expectation, method, path, authObj, newData, oldData });
const cases = [
  tc("profil: création e-mail particulier", "ALLOW", "create", "profiles/" + U, au(U), base),
  tc("profil: création avec abonnement premium", "DENY", "create", "profiles/" + U, au(U), { ...base, abonnement: "premium" }),
  tc("profil: création pro (pending)", "ALLOW", "create", "profiles/" + U, au(U), { ...base, userType: "professionnel", providerType: "prestataire", providerStatus: "pending", subscription: "none" }),
  tc("profil: création pro déjà approuvé", "DENY", "create", "profiles/" + U, au(U), { ...base, userType: "professionnel", providerType: "prestataire", providerStatus: "approved" }),
  tc("profil: création Google e-mail vérifié (jeton)", "ALLOW", "create", "profiles/" + U, au(U, { email_verified: true }), { ...base, emailVerified: true }),
  tc("profil: création emailVerified sans jeton", "DENY", "create", "profiles/" + U, au(U), { ...base, emailVerified: true }),
  tc("profil: création phoneVerified avec numéro (jeton)", "ALLOW", "create", "profiles/" + U, au(U, { phone_number: "+972500000000" }), { ...base, phoneVerified: true }),
  tc("profil: création phoneVerified sans numéro", "DENY", "create", "profiles/" + U, au(U), { ...base, phoneVerified: true }),
  tc("profil: création pour un autre uid", "DENY", "create", "profiles/" + OTHER, au(U), { ...base, uid: OTHER }),
  tc("profil: onboarding (nom, ville, justificatif false, code parrain)", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, name: "A", displayName: "A", city: "Haifa", gender: "Homme", purpose: "Rencontre", legalDocumentVerified: false, usedReferralCode: "ABC", updatedAt: "2026-11-22" }, existing),
  tc("profil: EditField bio", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, bio: "Bonjour" }, existing),
  tc("profil: mode nomade", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, nomadMode: false }, existing),
  tc("FAILLE: se donner premium", "DENY", "update", "profiles/" + U, au(U), { ...existing, abonnement: "premium" }, existing),
  tc("FAILLE: date de fin d'abonnement", "DENY", "update", "profiles/" + U, au(U), { ...existing, subscriptionEndDate: "2030-01-01" }, existing),
  tc("FAILLE: passer professionnel", "DENY", "update", "profiles/" + U, au(U), { ...existing, userType: "professionnel" }, existing),
  tc("FAILLE: providerStatus approved", "DENY", "update", "profiles/" + U, au(U), { ...existing, providerStatus: "approved" }, existing),
  tc("FAILLE: isAdmin", "DENY", "update", "profiles/" + U, au(U), { ...existing, isAdmin: true }, existing),
  tc("FAILLE: compteur remis à 0", "DENY", "update", "profiles/" + U, au(U), { ...existing, totalConversationsCreated: 0 }, existing),
  tc("compteur +1", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, totalConversationsCreated: 6 }, existing),
  tc("compteur absent -> 1", "ALLOW", "update", "profiles/" + U, au(U), { ...base, totalConversationsCreated: 1 }, base),
  tc("FAILLE: compteur +5", "DENY", "update", "profiles/" + U, au(U), { ...existing, totalConversationsCreated: 10 }, existing),
  tc("statut: se suspendre", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, status: "suspendu" }, existing),
  tc("statut: autre valeur", "DENY", "update", "profiles/" + U, au(U), { ...existing, status: "actif" }, existing),
  tc("statut: retirer la suspension", "DENY", "update", "profiles/" + U, au(U), existing, { ...existing, status: "suspendu" }),
  tc("parrainage: freeBoosts 0->1 + referredBy", "ALLOW", "update", "profiles/" + U, au(U), { ...existing, freeBoosts: 1, referredBy: "R1", referredByCode: "ABC" }, existing),
  tc("FAILLE: freeBoosts 1->5", "DENY", "update", "profiles/" + U, au(U), { ...existing, freeBoosts: 5 }, { ...existing, freeBoosts: 1 }),
  tc("FAILLE: changer referredBy", "DENY", "update", "profiles/" + U, au(U), { ...existing, referredBy: "R2" }, { ...existing, referredBy: "R1" }),
  tc("FAILLE: justificatif validé par soi-même", "DENY", "update", "profiles/" + U, au(U), { ...existing, legalDocumentVerified: true }, { ...existing, legalDocumentVerified: false }),
  tc("FAILLE: modifier le profil d'un autre", "DENY", "update", "profiles/" + OTHER, au(U), { ...existing, uid: OTHER, bio: "x" }, { ...existing, uid: OTHER }),
  tc("admin: changer l'abonnement", "ALLOW", "update", "profiles/" + U, au(ADMIN), { ...existing, abonnement: "premium" }, existing),
  tc("profil: suppression du compte", "ALLOW", "delete", "profiles/" + U, au(U), null, existing),
  tc("users: pushToken (création)", "ALLOW", "create", "users/" + U, au(U), { pushToken: "ExponentPushToken[abc]" }),
  tc("users: pushToken (mise à jour)", "ALLOW", "update", "users/" + U, au(U), { pushToken: "ExponentPushToken[def]" }, { pushToken: "ExponentPushToken[abc]" }),
  tc("FAILLE users: ajouter un e-mail", "DENY", "update", "users/" + U, au(U), { pushToken: "t", email: "pirate@x.dev" }, { pushToken: "t" }),
  tc("FAILLE users: écrire chez un autre", "DENY", "update", "users/" + OTHER, au(U), { pushToken: "t" }, { pushToken: "s" }),
  tc("users: suppression du compte", "ALLOW", "delete", "users/" + U, au(U), null, { pushToken: "t" }),
  tc("users/dogs: ajouter son chien (inchangé)", "ALLOW", "create", "users/" + U + "/dogs/d1", au(U), { name: "Rex", purpose: "Vente" }),
];
(async () => {
  const cfg = require(require("os").homedir() + "/.config/configstore/firebase-tools.json");
  auth.setRefreshToken(cfg.tokens.refresh_token);
  const c = new Client({ urlPrefix: "https://firebaserules.googleapis.com", apiVersion: "v1" });
  const testCases = cases.map((t) => ({
    expectation: t.expectation,
    request: { auth: t.authObj, path: P(t.path), method: t.method, ...(t.newData ? { resource: { data: t.newData } } : {}) },
    ...(t.oldData ? { resource: { data: t.oldData } } : {}),
  }));
  const r = await c.post(`/projects/${PROJECT_ID}:test`, { source: { files: [{ name: "firestore.rules", content: source }] }, testSuite: { testCases } });
  const results = r.body.testResults || [];
  let ok = 0;
  results.forEach((res, i) => { const pass = res.state === "SUCCESS"; if (pass) ok++; console.log(`${pass ? "✅" : "❌"} [${cases[i].expectation}] ${cases[i].name}${pass ? "" : "  -> " + JSON.stringify(res.debugMessages || res.errorPosition || res.state)}`); });
  console.log(`\n${ok}/${results.length} cas conformes`);
})().catch(e => console.error("ERR", e.message, JSON.stringify(e.context?.body || "").slice(0, 800)));
