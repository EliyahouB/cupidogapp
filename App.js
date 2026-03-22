// App.js
import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./config/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Auth screens
import Welcome from "./screens/auth/Welcome";
import UserTypeSelect from "./screens/auth/UserTypeSelect";
import ProviderTypeSelect from "./screens/auth/ProviderTypeSelect";
import AuthMethods from "./screens/auth/AuthMethods";
import SignUpEmail from "./screens/auth/SignUpEmail";
import SignUpPhone from "./screens/auth/SignUpPhone";
import SignIn from "./screens/SignIn";
import OnboardingProfile from "./screens/auth/OnboardingProfile";
import SubscriptionChoice from "./screens/auth/SubscriptionChoice";

// App screens
import Home from "./screens/Home";
import Chat from "./screens/Chat";
import MesChiens from "./screens/MesChiens";
import AjouterChien from "./screens/AjouterChien.js";
import Abonnements from "./screens/Abonnements";
import ModifierChien from "./screens/ModifierChien.js";
import StylePreview from "./screens/StylePreview.js";
import LikesHub from "./screens/LikesHub";
import Favoris from "./screens/Favoris";
import Profile from "./screens/Profile";
import EditField from "./screens/EditField";
import MesMatchs from "./screens/MesMatchs";
import Conversations from "./screens/Conversations";
import DetailsChien from "./screens/DetailsChien";
import ChiensParBut from "./screens/ChiensParBut";
import ProfileMenu from "./components/ProfileMenu";
import Settings from "./screens/Settings";
import HelpCenter from "./screens/HelpCenter";
import Support from "./screens/Support";
import InviteFriends from "./screens/InviteFriends";
import Terms from "./screens/Terms";
import PrivacyPolicy from "./screens/PrivacyPolicy";
import BlockedUsers from "./screens/BlockedUsers";
import LanguageSettings from "./screens/LanguageSettings";
import Marketplace from "./screens/Marketplace";
import ServicesList from "./screens/marketplace/services/ServicesList";
import BoutiqueHome from "./screens/marketplace/boutique/BoutiqueHome";
import ProductsList from "./screens/marketplace/boutique/ProductsList";
import ProductDetails from "./screens/marketplace/boutique/ProductDetails";
import CreateProduct from "./screens/marketplace/boutique/CreateProduct";
import Cart from "./screens/marketplace/boutique/Cart";
import InscriptionPro from "./screens/marketplace/professional/InscriptionPro";
import ServicesHome from "./screens/marketplace/services/ServicesHome";
import CreateService from "./screens/marketplace/services/CreateService";
import Checkout from "./screens/marketplace/boutique/Checkout";
import LeadForm from "./screens/marketplace/services/LeadForm";
import MesLeads from "./screens/marketplace/dashboard/MesLeads";
import EditProduct from "./screens/marketplace/dashboard/EditProduct";
import MesVentes from "./screens/marketplace/dashboard/MesVentes";
import MesProduits from "./screens/marketplace/dashboard/MesProduits";
import MesFactures from "./screens/marketplace/dashboard/MesFactures";
import MesFacturesAchat from "./screens/marketplace/dashboard/MesFacturesAchat";
import InvoiceDetails from "./screens/marketplace/dashboard/InvoiceDetails";
import ServiceDetails from "./screens/marketplace/services/ServiceDetails";
import RateService from "./screens/marketplace/services/RateService";
import MyLeads from "./screens/marketplace/services/MyLeads";
import MyReferral from "./screens/marketplace/services/MyReferral";
import MarketplaceHome from "./screens/marketplace/MarketplaceHome";
import PaymentScreen from "./screens/payment/PaymentScreen";
import ViewProfile from "./screens/ViewProfile";
import { CartProvider } from "./contexts/CartContext";

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("📱 Auth changed:", currentUser?.uid || "null");
      
      // Nettoyer l'ancien listener Firestore
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        // Écouter le profil en temps réel
        unsubscribeProfile = onSnapshot(
          doc(db, "profiles", currentUser.uid),
          (docSnap) => {
            console.log("📄 Firestore snapshot received, exists:", docSnap.exists());
            
            if (docSnap.exists()) {
              const profile = docSnap.data();
              console.log("📄 Profile onboardingCompleted:", profile.onboardingCompleted);
              setUserProfile(profile);
              const shouldShowOnboarding = profile.onboardingCompleted === false;
              console.log("📄 Should show onboarding:", shouldShowOnboarding);
              setOnboardingCompleted(!shouldShowOnboarding);
            } else {
              console.log("📄 No profile yet - showing onboarding");
              setUserProfile(null);
              setOnboardingCompleted(false);
            }
            setLoading(false);
          },
          (error) => {
            console.log("❌ Erreur Firestore:", error);
            setOnboardingCompleted(true);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setUserProfile(null);
        setOnboardingCompleted(true);
        setLoading(false);
      }

      setUser(currentUser);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  if (loading) {
    return null;
  }

  console.log("🎯 Rendering with:", { 
    user: !!user, 
    onboardingCompleted, 
    key: user ? (onboardingCompleted ? "app" : "onboarding") : "guest" 
  });

  return (
    <CartProvider>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <NavigationContainer>
          <Stack.Navigator 
            key={user ? (onboardingCompleted ? "app" : "onboarding") : "guest"}
            screenOptions={{ headerShown: false }}
          >
            {user ? (
              onboardingCompleted ? (
                // User connecté + onboarding complété → Home en premier
                <>
                  <Stack.Screen name="Home" component={Home} />
                  <Stack.Screen name="OnboardingProfile" component={OnboardingProfile} />
                  <Stack.Screen name="SubscriptionChoice" component={SubscriptionChoice} />
                  <Stack.Screen name="Abonnements" component={Abonnements} />
                  <Stack.Screen name="Chat" component={Chat} />
                  <Stack.Screen name="LanguageSettings" component={LanguageSettings} options={{ headerShown: false }} />
                  <Stack.Screen name="ViewProfile" component={ViewProfile} />
                  <Stack.Screen name="MesChiens" component={MesChiens} />
                  <Stack.Screen name="MesFactures" component={MesFactures} />
                  <Stack.Screen name="AjouterChien" component={AjouterChien} />
                  <Stack.Screen name="ModifierChien" component={ModifierChien} />
                  <Stack.Screen name="StylePreview" component={StylePreview} />
                  <Stack.Screen name="LikesHub" component={LikesHub} />
                  <Stack.Screen name="Favoris" component={Favoris} />
                  <Stack.Screen name="Profile" component={Profile} />
                  <Stack.Screen name="EditField" component={EditField} />
                  <Stack.Screen name="MesMatchs" component={MesMatchs} />
                  <Stack.Screen name="MyReferral" component={MyReferral} options={{ headerShown: false }} />
                  <Stack.Screen name="Conversations" component={Conversations} />
                  <Stack.Screen name="DetailsChien" component={DetailsChien} />
                  <Stack.Screen name="EditProduct" component={EditProduct} />
                  <Stack.Screen name="ChiensParBut" component={ChiensParBut} />
                  <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
                  <Stack.Screen name="Settings" component={Settings} />
                  <Stack.Screen name="HelpCenter" component={HelpCenter} />
                  <Stack.Screen name="Support" component={Support} />
                  <Stack.Screen name="InscriptionPro" component={InscriptionPro} />
                  <Stack.Screen name="InviteFriends" component={InviteFriends} />
                  <Stack.Screen name="InvoiceDetails" component={InvoiceDetails} />
                  <Stack.Screen name="Terms" component={Terms} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
                  <Stack.Screen name="BlockedUsers" component={BlockedUsers} />
                  <Stack.Screen name="Marketplace" component={Marketplace} />
                  <Stack.Screen name="ServicesList" component={ServicesList} />
                  <Stack.Screen name="ServiceDetails" component={ServiceDetails} />
                  <Stack.Screen name="LeadForm" component={LeadForm} />
                  <Stack.Screen name="CreateService" component={CreateService} />
                  <Stack.Screen name="BoutiqueHome" component={BoutiqueHome} />
                  <Stack.Screen name="Cart" component={Cart} />
                  <Stack.Screen name="Checkout" component={Checkout} />
                  <Stack.Screen name="CreateProduct" component={CreateProduct} />
                  <Stack.Screen name="ProductDetails" component={ProductDetails} />
                  <Stack.Screen name="ProductsList" component={ProductsList} />
                  <Stack.Screen name="ServicesHome" component={ServicesHome} />
                  <Stack.Screen name="MesLeads" component={MesLeads} />
                  <Stack.Screen name="RateService" component={RateService} options={{ headerShown: false }} />
                  <Stack.Screen name="MyLeads" component={MyLeads} options={{ headerShown: false }} /> 
                  <Stack.Screen name="MesVentes" component={MesVentes} />
                  <Stack.Screen name="MesFacturesAchat" component={MesFacturesAchat} />
                  <Stack.Screen name="MesProduits" component={MesProduits} />
                  <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MarketplaceHome" component={MarketplaceHome} />
                </>
              ) : (
                // User connecté + onboarding PAS complété → OnboardingProfile en premier
                <>
                  <Stack.Screen 
                    name="OnboardingProfile" 
                    component={OnboardingProfile}
                    initialParams={{ 
                      userType: userProfile?.userType || "particulier",
                      providerType: userProfile?.providerType 
                    }}
                  />
                  <Stack.Screen name="SubscriptionChoice" component={SubscriptionChoice} />
                  <Stack.Screen name="Home" component={Home} />
                  <Stack.Screen name="Abonnements" component={Abonnements} />
                  <Stack.Screen name="Chat" component={Chat} />
                  <Stack.Screen name="ViewProfile" component={ViewProfile} />
                  <Stack.Screen name="MesChiens" component={MesChiens} />
                  <Stack.Screen name="MesFactures" component={MesFactures} />
                  <Stack.Screen name="AjouterChien" component={AjouterChien} />
                  <Stack.Screen name="ModifierChien" component={ModifierChien} />
                  <Stack.Screen name="StylePreview" component={StylePreview} />
                  <Stack.Screen name="LikesHub" component={LikesHub} />
                  <Stack.Screen name="Favoris" component={Favoris} />
                  <Stack.Screen name="Profile" component={Profile} />
                  <Stack.Screen name="EditField" component={EditField} />
                  <Stack.Screen name="MesMatchs" component={MesMatchs} />
                  <Stack.Screen name="Conversations" component={Conversations} />
                  <Stack.Screen name="DetailsChien" component={DetailsChien} />
                  <Stack.Screen name="EditProduct" component={EditProduct} />
                  <Stack.Screen name="ChiensParBut" component={ChiensParBut} />
                  <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
                  <Stack.Screen name="Settings" component={Settings} />
                  <Stack.Screen name="HelpCenter" component={HelpCenter} />
                  <Stack.Screen name="Support" component={Support} />
                  <Stack.Screen name="InscriptionPro" component={InscriptionPro} />
                  <Stack.Screen name="InviteFriends" component={InviteFriends} />
                  <Stack.Screen name="InvoiceDetails" component={InvoiceDetails} />
                  <Stack.Screen name="Terms" component={Terms} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
                  <Stack.Screen name="BlockedUsers" component={BlockedUsers} />
                  <Stack.Screen name="Marketplace" component={Marketplace} />
                  <Stack.Screen name="ServicesList" component={ServicesList} />
                  <Stack.Screen name="ServiceDetails" component={ServiceDetails} />
                  <Stack.Screen name="LeadForm" component={LeadForm} />
                  <Stack.Screen name="CreateService" component={CreateService} />
                  <Stack.Screen name="BoutiqueHome" component={BoutiqueHome} />
                  <Stack.Screen name="Cart" component={Cart} />
                  <Stack.Screen name="Checkout" component={Checkout} />
                  <Stack.Screen name="CreateProduct" component={CreateProduct} />
                  <Stack.Screen name="ProductDetails" component={ProductDetails} />
                  <Stack.Screen name="ProductsList" component={ProductsList} />
                  <Stack.Screen name="ServicesHome" component={ServicesHome} />
                  <Stack.Screen name="MesLeads" component={MesLeads} />
                  <Stack.Screen name="MesVentes" component={MesVentes} />
                  <Stack.Screen name="MesFacturesAchat" component={MesFacturesAchat} />
                  <Stack.Screen name="MesProduits" component={MesProduits} />
                  <Stack.Screen name="MarketplaceHome" component={MarketplaceHome} />
                </>
              )
            ) : (
              // Non connecté
              <>
                <Stack.Screen name="Welcome" component={Welcome} />
                <Stack.Screen name="UserTypeSelect" component={UserTypeSelect} />
                <Stack.Screen name="ProviderTypeSelect" component={ProviderTypeSelect} />
                <Stack.Screen name="AuthMethods" component={AuthMethods} />
                <Stack.Screen name="SignUpEmail" component={SignUpEmail} />
                <Stack.Screen name="SignUpPhone" component={SignUpPhone} />
                <Stack.Screen name="SignIn" component={SignIn} />
                <Stack.Screen name="Terms" component={Terms} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </CartProvider>
  );
}