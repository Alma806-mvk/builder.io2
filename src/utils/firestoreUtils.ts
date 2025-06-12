import {
  doc,
  getDoc,
  setDoc,
  DocumentReference,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  db,
  isFirestoreConnected,
  reconnectFirestore,
} from "../config/firebase";

export interface FirestoreOptions {
  retryAttempts?: number;
  retryDelay?: number;
  fallbackToOffline?: boolean;
}

const DEFAULT_OPTIONS: FirestoreOptions = {
  retryAttempts: 2,
  retryDelay: 1000,
  fallbackToOffline: true,
};

/**
 * Enhanced Firestore getDoc with offline handling and retries
 */
export const safeGetDoc = async <T>(
  docRef: DocumentReference,
  options: FirestoreOptions = DEFAULT_OPTIONS,
): Promise<{ data: T | null; success: boolean; error?: string }> => {
  const {
    retryAttempts = 2,
    retryDelay = 1000,
    fallbackToOffline = true,
  } = options;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const docSnap = await getDoc(docRef);
      return {
        data: docSnap.exists() ? (docSnap.data() as T) : null,
        success: true,
      };
    } catch (error: any) {
      const isOfflineError =
        error?.code === "unavailable" ||
        error?.message?.includes("offline") ||
        error?.code === "permission-denied";

      console.warn(
        `Firestore getDoc attempt ${attempt + 1}/${retryAttempts + 1} failed:`,
        error?.message || error,
      );

      if (isOfflineError) {
        if (attempt === retryAttempts) {
          // Final attempt failed - return fallback result
          return {
            data: null,
            success: false,
            error: fallbackToOffline
              ? "offline"
              : error?.message || "Firestore unavailable",
          };
        }

        // Try to reconnect
        if (!isFirestoreConnected()) {
          reconnectFirestore();
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (attempt + 1)),
        );
      } else {
        // Non-offline error - don't retry
        return {
          data: null,
          success: false,
          error: error?.message || "Firestore error",
        };
      }
    }
  }

  return {
    data: null,
    success: false,
    error: "Max retry attempts exceeded",
  };
};

/**
 * Enhanced Firestore setDoc with offline handling and retries
 */
export const safeSetDoc = async <T>(
  docRef: DocumentReference,
  data: T,
  options: FirestoreOptions = DEFAULT_OPTIONS,
): Promise<{ success: boolean; error?: string }> => {
  const { retryAttempts = 2, retryDelay = 1000 } = options;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      await setDoc(docRef, data, { merge: true });
      return { success: true };
    } catch (error: any) {
      const isOfflineError =
        error?.code === "unavailable" ||
        error?.message?.includes("offline") ||
        error?.code === "permission-denied";

      console.warn(
        `Firestore setDoc attempt ${attempt + 1}/${retryAttempts + 1} failed:`,
        error?.message || error,
      );

      if (isOfflineError && attempt < retryAttempts) {
        // Try to reconnect
        if (!isFirestoreConnected()) {
          reconnectFirestore();
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (attempt + 1)),
        );
      } else {
        return {
          success: false,
          error: error?.message || "Firestore error",
        };
      }
    }
  }

  return {
    success: false,
    error: "Max retry attempts exceeded",
  };
};

/**
 * Get document with automatic fallback to default value
 */
export const getDocWithFallback = async <T>(
  docRef: DocumentReference,
  fallbackValue: T,
  options: FirestoreOptions = DEFAULT_OPTIONS,
): Promise<T> => {
  const result = await safeGetDoc<T>(docRef, options);

  if (result.success && result.data !== null) {
    return result.data;
  }

  if (result.error === "offline") {
    console.log("🔌 Using fallback value due to Firestore offline status");
  } else if (result.error) {
    console.warn(
      "⚠️ Using fallback value due to Firestore error:",
      result.error,
    );
  }

  return fallbackValue;
};

/**
 * Utility to create Firestore document reference
 */
export const createDocRef = (collection: string, docId: string) => {
  return doc(db, collection, docId);
};

/**
 * Check if an error is due to Firestore being offline
 */
export const isOfflineError = (error: any): boolean => {
  return (
    error?.code === "unavailable" ||
    error?.message?.includes("offline") ||
    error?.code === "permission-denied"
  );
};
