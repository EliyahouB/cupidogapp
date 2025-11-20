import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";

import Welcome from "./screens/Welcome";
import Home from "./screens/Home";
import Chat from "./screens/Chat";
import MesChiens from "./screens/MesChiens";
import Likes from "./screens/Likes";
import Profile from "./screens/Profile";
import SignUp from "./screens/SignUp";
import SignIn from "./screens/SignIn";
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
import Marketplace from "./screens/Marketplace";

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="Chat" component={Chat} />
              <Stack.Screen name="MesChiens" component={MesChiens} />
              <Stack.Screen name="Likes" component={Likes} />
              <Stack.Screen name="Profile" component={Profile} />
              <Stack.Screen name="MesMatchs" component={MesMatchs} />
              <Stack.Screen name="Conversations" component={Conversations} />
              <Stack.Screen name="DetailsChien" component={DetailsChien} />
              <Stack.Screen name="ChiensParBut" component={ChiensParBut} />
              <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
              <Stack.Screen name="Settings" component={Settings} />
              <Stack.Screen name="HelpCenter" component={HelpCenter} />
              <Stack.Screen name="Support" component={Support} />
              <Stack.Screen name="InviteFriends" component={InviteFriends} />
              <Stack.Screen name="Terms" component={Terms} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
              <Stack.Screen name="BlockedUsers" component={BlockedUsers} />
              <Stack.Screen name="Marketplace" component={Marketplace} />
            </>
          ) : (
            <>
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen name="SignIn" component={SignIn} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}