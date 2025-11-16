import * as SecureStore from "expo-secure-store";

export const getUserId = async () => {
  try {
    return await SecureStore.getItemAsync("userId");
  } catch (e) {
    return null;
  }
};

export const removeUserId = async () => {
  try {
    await SecureStore.deleteItemAsync("userId");
  } catch (e) {
    console.log("Erreur suppression userId", e);
  }
};
