// App.js
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import Welcome from "./screens/Welcome";
import SignUp from "./screens/SignUp";
import SignIn from "./screens/SignIn";
import Home from "./screens/Home";
import MesChiens from "./screens/MesChiens";
import Rencontres from "./screens/Rencontres";
import Eleveur from "./screens/Eleveur";
import AchatVente from "./screens/AchatVente";
import Messages from "./screens/Messages";
import Chat from "./screens/Chat";
import Profile from "./screens/Profile";
import CreateAnnonce from "./screens/CreateAnnonce";
import Detail from "./screens/Detail";
import TestFirebase from "./screens/TestFirebase";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome">
              {(props) => <Welcome {...props} onAuth={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="SignIn" component={SignIn} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home">
              {(props) => <Home {...props} user={user} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="MesChiens" component={MesChiens} />
            <Stack.Screen name="Rencontres" component={Rencontres} />
            <Stack.Screen name="Eleveur" component={Eleveur} />
            <Stack.Screen name="AchatVente" component={AchatVente} />
            <Stack.Screen name="Detail" component={Detail} />
            <Stack.Screen name="CreateAnnonce" component={CreateAnnonce} />
            <Stack.Screen name="Messages" component={Messages} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="TestFirebase" component={TestFirebase} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
