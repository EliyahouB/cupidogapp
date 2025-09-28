// helpers/firestore.js
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref as storageRefFactory, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase";
import { v4 as uuidv4 } from "uuid";

export async function createAnnonce(data) {
  try {
    const payload = {
      ...data,
      createdAt: data.createdAt || serverTimestamp()
    };
    const col = collection(db, "annonces");
    const docRef = await addDoc(col, payload);
    return docRef.id;
  } catch (err) {
    throw new Error("createAnnonce failed: " + (err?.message ?? String(err)));
  }
}

export async function uploadImageAsync(blob, pathPrefix = "images", contentType) {
  try {
    const id = uuidv4();
    const path = `${pathPrefix}/${id}`;
    const storageRef = storageRefFactory(storage, path);

    // Si besoin, ajouter metadata: { contentType }
    if (contentType) {
      await uploadBytes(storageRef, blob, { contentType });
    } else {
      await uploadBytes(storageRef, blob);
    }

    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    throw new Error("uploadImageAsync failed: " + (err?.message ?? String(err)));
  }
}

export function subscribeAnnonces(callback, onError) {
  const q = query(collection(db, "annonces"), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (err) => {
      if (typeof onError === "function") onError(err);
      else console.warn("subscribeAnnonces error:", err);
    }
  );
  return unsub;
}
