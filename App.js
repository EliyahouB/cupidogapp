import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Welcome from "./screens/Welcome";
import Home from "./screens/Home";
import Chat from "./screens/Chat";
import MesChiens from "./screens/MesChiens";
import Likes from "./screens/Likes";
import { LogBox } from "react-native";

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(true);

  useEffect(() => {
    // Si tu as du code d'initialisation (firebase, fonts, splash), place-le ici.
    // Exemple: charger les fonts et initialiser Firebase.
    // setReady(true) une fois fini.
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Chat" component={Chat} />
          <Stack.Screen name="MesChiens" component={MesChiens} />
          <Stack.Screen name="Likes" component={Likes} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
