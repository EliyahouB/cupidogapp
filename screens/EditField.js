import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";

export default function EditField({ route, navigation }) {
  const { field, title, currentValue, profileId } = route.params;

  const [value, setValue] = useState(currentValue || "");
  const [imageUri, setImageUri] = useState(currentValue || null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(
    currentValue && currentValue.toDate ? currentValue.toDate() : new Date()
  );

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur sélection image :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_selecting_image"));
    }
  };

  const handleSave = async () => {
    if (field === "name" && !value.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("name_required"));
      return;
    }

    if (field === "city" && !value.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("city_required"));
      return;
    }

    if (field === "dateOfBirth") {
      const age = calculateAge(date);
      if (age < 18) {
        Alert.alert(
          i18n.t("minimum_age_required"),
          i18n.t("must_be_18"),
          [{ text: i18n.t("ok") }]
        );
        return;
      }
    }

    setLoading(true);

    try {
      let finalValue = value;

      if (field === "photo") {
        if (imageUri && !imageUri.startsWith("https://")) {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const filename = `profilePhotos/${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          finalValue = await getDownloadURL(storageRef);
        } else {
          finalValue = imageUri;
        }
      }

      if (field === "dateOfBirth") {
        finalValue = date;
      }

      const profileRef = doc(db, "profiles", profileId);
      const fieldName = field === "photo" ? "photoUrl" : field;
      await updateDoc(profileRef, { [fieldName]: finalValue });

      Alert.alert(i18n.t("success"), i18n.t("profile_updated"));
      navigation.goBack();
    } catch (error) {
      console.error("Erreur sauvegarde :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_saving"));
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const getLocale = () => {
    if (i18n.locale === "he") return "he-IL";
    if (i18n.locale === "ru") return "ru-RU";
    if (i18n.locale === "en") return "en-US";
    return "fr-FR";
  };

  const renderInput = () => {
    switch (field) {
      case "photo":
        return (
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={48} color="#999" />
                <Text style={styles.photoText}>{i18n.t("choose_photo")}</Text>
              </View>
            )}
          </TouchableOpacity>
        );

      case "dateOfBirth":
        return (
          <View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={24} color="#FF6B35" />
              <Text style={styles.dateText}>
                {date.toLocaleDateString(getLocale(), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
                locale={getLocale()}
              />
            )}

            <Text style={styles.hint}>
              {i18n.t("current_age")}: {calculateAge(date)} {i18n.t("years_old")}
            </Text>
            {calculateAge(date) < 18 && (
              <Text style={styles.warning}>
                ⚠️ {i18n.t("must_be_18")}
              </Text>
            )}
          </View>
        );

      case "gender":
        return (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => setValue(itemValue)}
            >
              <Picker.Item label={i18n.t("male")} value="Homme" />
              <Picker.Item label={i18n.t("female")} value="Femme" />
            </Picker>
          </View>
        );

      case "purpose":
        return (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => setValue(itemValue)}
            >
              <Picker.Item label={i18n.t("stud")} value="Saillie" />
              <Picker.Item label={i18n.t("adoption")} value="Adoption" />
              <Picker.Item label={i18n.t("meetup")} value="Rencontre" />
              <Picker.Item label={i18n.t("sale")} value="Vente" />
              <Picker.Item label={i18n.t("exchange")} value="Échange" />
            </Picker>
          </View>
        );

      case "bio":
        return (
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={value}
            onChangeText={setValue}
            multiline
            placeholder={i18n.t("tell_us_about_you")}
            placeholderTextColor="#999"
            textAlignVertical="top"
          />
        );

      default:
        return (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={i18n.t("your") + " " + title.toLowerCase()}
            placeholderTextColor="#999"
          />
        );
    }
  };

  return (
    <ScreenLayout title={title} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>{title}</Text>
        {renderInput()}
      </ScrollView>

      <TouchableOpacity
        style={styles.saveButtonContainer}
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"]}
          style={styles.saveButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="check" size={24} color="#FFF" />
          <Text style={styles.saveText}>
            {loading ? i18n.t("saving") : i18n.t("save")}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFF",
    color: "#1A1A1D",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  bioInput: {
    height: 120,
    paddingTop: 14,
  },
  pickerWrapper: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  imagePicker: {
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  photo: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  photoPlaceholder: {
    alignItems: "center",
  },
  photoText: {
    color: "#6B7280",
    marginTop: 8,
    fontSize: 14,
  },
  dateButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: "#1A1A1D",
    fontWeight: "500",
  },
  hint: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  warning: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "600",
  },
  saveButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  saveText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});