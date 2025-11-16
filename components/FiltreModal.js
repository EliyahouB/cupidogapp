import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";

const races = [
  "Labrador Retriever",
  "Berger Allemand",
  "Golden Retriever",
  "Chihuahua",
  "Bouledogue Français",
  "Border Collie",
  "Husky Sibérien",
  "Beagle",
  "Rottweiler",
  "Teckel",
  "Shih Tzu",
  "Akita Inu",
  "Cane Corso",
  "Jack Russell Terrier",
  "Yorkshire Terrier",
];

export default function FiltreModal({
  visible,
  onClose,
  onApply,
  filters,
  setFilters,
  isPremium,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>🔍 Filtres de recherche</Text>

          <Text style={styles.label}>Âge minimum : {filters.minAge} ans</Text>
          <Slider
            minimumValue={1}
            maximumValue={15}
            step={1}
            value={filters.minAge}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, minAge: value }))
            }
          />

          <Text style={styles.label}>Âge maximum : {filters.maxAge} ans</Text>
          <Slider
            minimumValue={1}
            maximumValue={15}
            step={1}
            value={filters.maxAge}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, maxAge: value }))
            }
          />

          <Text style={styles.label}>Race</Text>
          <Picker
            selectedValue={filters.breed}
            style={styles.input}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, breed: value }))
            }
          >
            <Picker.Item label="Toutes les races" value="" />
            {races.map((race) => (
              <Picker.Item key={race} label={race} value={race} />
            ))}
          </Picker>

          <Text style={styles.label}>Autre race (champ libre)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Spitz Japonais"
            placeholderTextColor="#888"
            value={filters.breedText}
            onChangeText={(text) =>
              setFilters((prev) => ({ ...prev, breedText: text }))
            }
          />

          {isPremium && (
            <>
              <Text style={styles.label}>Pedigree uniquement</Text>
              <Switch
                value={filters.pedigreeOnly}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, pedigreeOnly: value }))
                }
              />
            </>
          )}

          <Text style={styles.label}>Distance max : {filters.distance} km</Text>
          <Slider
            minimumValue={0}
            maximumValue={1000}
            step={10}
            value={filters.distance}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, distance: value }))
            }
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={onApply}>
              <Text style={styles.buttonText}>Appliquer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
    textAlign: "center",
  },
  label: {
    color: "#333",
    marginTop: 12,
    fontSize: 15,
  },
  input: {
    backgroundColor: "#fff",
    color: "#003366",
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    backgroundColor: "#42A5F5",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  cancel: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  cancelText: {
    color: "#003366",
    textAlign: "center",
    fontWeight: "bold",
  },
});
