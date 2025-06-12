import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  enableNetwork,
  onSnapshotsInSync,
  disableNetwork,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firestore connection management
let isFirestoreOnline = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Monitor Firestore connection status
const monitorFirestoreConnection = () => {
  onSnapshotsInSync(db, () => {
    if (!isFirestoreOnline) {
      console.log("🟢 Firestore connection restored");
      isFirestoreOnline = true;
      reconnectAttempts = 0;
    }
  });
};

// Enable Firestore network with retry logic
const connectFirestore = async () => {
  try {
    await enableNetwork(db);
    isFirestoreOnline = true;
    console.log("🟢 Firestore connected successfully");
    monitorFirestoreConnection();
  } catch (error: any) {
    isFirestoreOnline = false;
    console.warn("🔴 Failed to connect to Firestore:", error?.message || error);

    // Retry connection after delay
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
      console.log(
        `🔄 Retrying Firestore connection in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      );
      setTimeout(connectFirestore, delay);
    } else {
      console.log(
        "❌ Max Firestore connection attempts reached. App will work in offline mode.",
      );
    }
  }
};

// Initialize connection
connectFirestore();

// Export connection status checker
export const isFirestoreConnected = () => isFirestoreOnline;

// Export manual reconnection function
export const reconnectFirestore = () => {
  reconnectAttempts = 0;
  connectFirestore();
};

export default app;
