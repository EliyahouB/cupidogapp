import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";

export default function FicheChien({ route, navigation }) {
  const {
    dogName,
    breed,
    age,
    gender,
    description,
    pedigree,
    contest,
    result,
    photoUrl,
    ownerId,
  } = route.params;

  const getTranslatedGender = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "male" || normalized === "mâle" || normalized === "זכר" || normalized === "male_dog") return i18n.t("male_dog");
    if (normalized === "female" || normalized === "femelle" || normalized === "נקבה" || normalized === "female_dog") return i18n.t("female_dog");
    return value || i18n.t("unknown");
  };

  const getTranslatedPurpose = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "meetup" || normalized === "rencontre" || normalized === "מפגש" || normalized === "meeting") return i18n.t("meetup");
    if (normalized === "sale" || normalized === "vente" || normalized === "מכירה") return i18n.t("sale");
    if (normalized === "stud" || normalized === "saillie" || normalized === "הרבעה") return i18n.t("stud");
    return value || i18n.t("unknown");
  };

  const getTranslatedPedigree = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "oui" || normalized === "yes" || normalized === "true" || normalized === "כן") return i18n.t("yes");
    if (normalized === "non" || normalized === "no" || normalized === "false" || normalized === "לא") return i18n.t("no");
    return value || i18n.t("unknown");
  };

  const getTranslatedContest = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "oui" || normalized === "yes" || normalized === "true" || normalized === "כן") return i18n.t("yes");
    if (normalized === "non" || normalized === "no" || normalized === "false" || normalized === "לא") return i18n.t("no");
    return value || i18n.t("unknown");
  };

  const getTranslatedBreed = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const breedMap = {
      "autre": "other",
      "other": "other",
      "mixed breed": "mixed_breed",
      "métis": "mixed_breed",
      "croisé": "mixed_breed",
      "croise": "mixed_breed",
      "מעורב": "mixed_breed",
      "akita inu": "akita_inu",
      "beagle": "beagle",
      "berger allemand": "berger_allemand",
      "berger australien": "berger_australien",
      "bichon frise": "bichon_frise",
      "border collie": "border_collie",
      "bulldog anglais": "bulldog_anglais",
      "bouledogue francais": "bulldog_anglais",
      "caniche": "caniche",
      "chihuahua": "chihuahua",
      "cocker spaniel": "cocker_spaniel",
      "dalmatien": "dalmatien",
      "doberman": "doberman",
      "golden retriever": "golden_retriever",
      "grand danois": "grand_danois",
      "husky sibérien": "husky_siberien",
      "husky siberien": "husky_siberien",
      "labrador retriever": "labrador_retriever",
      "mastiff": "mastiff",
      "rottweiler": "rottweiler",
      "saint bernard": "saint_bernard",
      "samoyede": "samoyede",
      "shiba inu": "shiba_inu",
      "shih tzu": "shih_tzu",
      "vizsla": "vizsla",
      "weimaraner": "weimaraner",
      "yorkshire terrier": "yorkshire_terrier",
    };

    const key = breedMap[normalized];
    if (key) {
      const translated = i18n.t(key);
      return translated !== key ? translated : value || i18n.t("unknown");
    }

    return value || i18n.t("unknown");
  };

  return (
    <ScreenLayout title={dogName} navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>{i18n.t("no_image")}</Text>
          </View>
        )}

        <Text style={styles.label}>{i18n.t("breed")}</Text>
        <Text style={styles.value}>{getTranslatedBreed(breed)}</Text>

        <Text style={styles.label}>{i18n.t("age")}</Text>
        <Text style={styles.value}>{age}</Text>

        <Text style={styles.label}>{i18n.t("gender")}</Text>
        <Text style={styles.value}>{getTranslatedGender(gender)}</Text>

        <Text style={styles.label}>{i18n.t("description")}</Text>
        <Text style={styles.value}>{description}</Text>

        <Text style={styles.label}>{i18n.t("pedigree")}</Text>
        <Text style={styles.value}>{getTranslatedPedigree(pedigree)}</Text>

        <Text style={styles.label}>{i18n.t("contest")}</Text>
        <Text style={styles.value}>{getTranslatedContest(contest)}</Text>

        {getTranslatedContest(contest) === i18n.t("yes") && (
          <>
            <Text style={styles.label}>{i18n.t("result")}</Text>
            <Text style={styles.value}>{result}</Text>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Chat", { ownerId, dogName })}
        >
          <Text style={styles.buttonText}>{i18n.t("contact_owner")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imageText: {
    color: "#aaa",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff914d",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: "#fff",
    alignSelf: "flex-start",
  },
  button: {
    backgroundColor: "#ff914d",
    padding: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
    alignSelf: "stretch",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});