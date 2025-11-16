import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Écrans principaux
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
import Settings from "./screens/Settings";

// Écrans ajoutés depuis ProfileMenu
import HelpCenter from "./screens/HelpCenter";
import Support from "./screens/Support";
import InviteFriends from "./screens/InviteFriends";

// Composants
import ProfileMenu from "./components/ProfileMenu";

import { LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("Welcome");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setInitialRoute(user ? "Home" : "Welcome");
      setReady(true);
    });

    return () => unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Chat" component={Chat} />
          <Stack.Screen name="MesChiens" component={MesChiens} />
          <Stack.Screen name="Likes" component={Likes} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="MesMatchs" component={MesMatchs} />
          <Stack.Screen name="Conversations" component={Conversations} />
          <Stack.Screen name="DetailChien" component={DetailsChien} />
          <Stack.Screen name="ChiensParBut" component={ChiensParBut} />
          <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="HelpCenter" component={HelpCenter} />
          <Stack.Screen name="Support" component={Support} />
          <Stack.Screen name="InviteFriends" component={InviteFriends} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
