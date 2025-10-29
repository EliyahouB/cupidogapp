import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigationRef.current?.navigate("Home");
      } else {
        navigationRef.current?.navigate("Welcome");
      }
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
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
