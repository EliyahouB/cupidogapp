import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import i18n from "../utils/i18n";
import { Formik } from "formik";
import * as Yup from "yup";

const SignUpSchema = Yup.object().shape({
  email: Yup.string()
    .email(i18n.t("invalidEmail"))
    .required(i18n.t("fillEmailPassword")),
  password: Yup.string()
    .min(6, i18n.t("passwordTooShort"))
    .required(i18n.t("fillEmailPassword")),
});

export default function SignUp({ navigation }) {
  const handleSignUp = async (values) => {
    try {
      console.log("1. Création compte Auth...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const user = userCredential.user;
      console.log("2. Compte créé, UID:", user.uid);

      console.log("3. Création profil Firestore...");
      const docRef = await addDoc(collection(db, "profiles"), {
        uid: user.uid,
        email: user.email,
        name: user.email.split("@")[0],
        createdAt: new Date(),
        hideProfile: false,
        nomadMode: true,
        city: "",
        bio: "",
        photoUrl: null,
        purpose: "",
        gender: "",
      });
      console.log("4. Profil créé avec ID:", docRef.id);

      console.log("5. Navigation vers Profile...");
      navigation.replace("Profile");
    } catch (e) {
      console.log("ERREUR COMPLETE:", e);
      console.log("Code erreur:", e.code);
      console.log("Message erreur:", e.message);
      
      let message = "Erreur lors de l inscription";
      if (e.code === "auth/email-already-in-use")
        message = "Email deja utilise";
      if (e.code === "auth/invalid-email") 
        message = "Email invalide";
      
      Alert.alert("Erreur", message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{i18n.t("signup")}</Text>

      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={SignUpSchema}
        onSubmit={handleSignUp}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("email")}
              value={values.email}
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {touched.email && errors.email && (
              <Text style={styles.error}>{errors.email}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder={i18n.t("password")}
              value={values.password}
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              secureTextEntry
            />
            {touched.password && errors.password && (
              <Text style={styles.error}>{errors.password}</Text>
            )}

            <View style={{ width: "80%", marginTop: 12 }}>
              <Button title={i18n.t("signup")} onPress={handleSubmit} />
            </View>
          </>
        )}
      </Formik>

      <View style={{ marginTop: 12 }}>
        <Button title={i18n.t("back")} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 30,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: {
    width: "85%",
    height: 48,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  error: {
    color: "red",
    fontSize: 14,
    marginTop: -4,
    marginBottom: 8,
    alignSelf: "flex-start",
    width: "85%",
  },
});