// vite.config.ts
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Debug: Log which Firebase API key is being loaded
  console.log(
    "🔍 Firebase API Key loaded:",
    env.FIREBASE_API_KEY
      ? `${env.FIREBASE_API_KEY.substring(0, 10)}...`
      : "NOT FOUND",
  );
  console.log(
    "🔍 API Key starts with 'AIza':",
    env.FIREBASE_API_KEY?.startsWith("AIza"),
  );
  console.log("🔍 API Key length:", env.FIREBASE_API_KEY?.length);
  console.log("🔍 Environment variables loaded from .env.local");

  return {
    define: {
      // Keep your Gemini key definition
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),

      // Add Firebase config variables from your .env.local
      "process.env.FIREBASE_API_KEY": JSON.stringify(env.FIREBASE_API_KEY),
      "process.env.FIREBASE_AUTH_DOMAIN": JSON.stringify(
        env.FIREBASE_AUTH_DOMAIN,
      ),
      "process.env.FIREBASE_PROJECT_ID": JSON.stringify(
        env.FIREBASE_PROJECT_ID,
      ),
      "process.env.FIREBASE_STORAGE_BUCKET": JSON.stringify(
        env.FIREBASE_STORAGE_BUCKET,
      ),
      "process.env.FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
        env.FIREBASE_MESSAGING_SENDER_ID,
      ),
      "process.env.FIREBASE_APP_ID": JSON.stringify(env.FIREBASE_APP_ID),
      "process.env.FIREBASE_MEASUREMENT_ID": JSON.stringify(
        env.FIREBASE_MEASUREMENT_ID,
      ),

      // Add RECAPTCHA_SITE_KEY later when you set up App Check
      "process.env.RECAPTCHA_SITE_KEY": JSON.stringify(env.RECAPTCHA_SITE_KEY),

      // Add Stripe configuration
      "process.env.STRIPE_PUBLISHABLE_KEY": JSON.stringify(
        env.STRIPE_PUBLISHABLE_KEY,
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
