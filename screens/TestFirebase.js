// screens/TestFirebase.js
import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, View, Button, ActivityIndicator, ScrollView } from "react-native";
import { auth, db, storage } from "../config/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function TestFirebase() {
  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(false);

  const append = (line) => setStatus((s) => [...s, String(line)]);

  useEffect(() => {
    append("Écran prêt. Appuyez sur Tests pour démarrer.");
  }, []);

  const runTests = async () => {
    setLoading(true);
    setStatus([]);
    try {
      append("auth.currentUser: " + (auth.currentUser ? auth.currentUser.uid : "null"));
      const d = await getDoc(doc(db, "test", "testDoc"));
      append(d.exists() ? "Firestore doc trouvé" : "Firestore doc absent");
      try {
        const bytes = new Uint8Array([0, 1, 2, 3, 4]);
        const storageRef = ref(storage, `tests/test-${Date.now()}.bin`);
        await uploadBytes(storageRef, bytes);
        const url = await getDownloadURL(storageRef);
        append("Storage OK: " + url);
      } catch (e) {
        append("Storage erreur: " + (e?.message ?? String(e)));
      }
    } catch (e) {
      append("Erreur: " + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      append("Déconnecté");
    } catch (e) {
      append("signOut erreur: " + (e?.message ?? String(e)));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        <View style={{ marginBottom: 12 }}>
          <Button title="Lancer les tests Firebase" onPress={runTests} disabled={loading} />
        </View>
        <View style={{ marginBottom: 12 }}>
          <Button title="SignOut" onPress={handleSignOut} />
        </View>

        {loading && <ActivityIndicator size="large" />}

        <View style={{ marginTop: 12 }}>
          {status.map((s, i) => (
            <Text key={i} style={{ marginBottom: 8 }}>{s}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
