import React from "react";
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import i18n from "../utils/i18n";
import { Formik } from "formik";
import * as Yup from "yup";

const SignUpSchema = Yup.object().shape({
  email: Yup.string().email(i18n.t("invalidEmail")).required(i18n.t("fillEmailPassword")),
  password: Yup.string().min(6, i18n.t("passwordTooShort")).required(i18n.t("fillEmailPassword"))
});

export default function SignUp({ navigation }) {
  const handleSignUp = async (values) => {
    try {
      await createUserWithEmailAndPassword(auth, values.email, values.password);
      navigation.replace("Home");
    } catch (e) {
      let message = i18n.t("signupFailed");
      if (e.code === "auth/email-already-in-use") message = i18n.t("emailInUse");
      if (e.code === "auth/invalid-email") message = i18n.t("invalidEmail");
      Alert.alert(i18n.t("error"), message);
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
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
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
            {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <TextInput
              style={styles.input}
              placeholder={i18n.t("password")}
              value={values.password}
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              secureTextEntry
            />
            {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

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
  container: { flex: 1, alignItems: "center", paddingTop: 30, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { width: "85%", height: 48, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginVertical: 8 },
  error: { color: "red", fontSize: 14, marginTop: -4, marginBottom: 8, alignSelf: "flex-start", width: "85%" }
});
