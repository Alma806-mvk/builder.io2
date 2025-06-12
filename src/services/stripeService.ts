import { loadStripe, Stripe } from "@stripe/stripe-js";
import { SubscriptionPlan } from "../types/subscription";
import { mockSubscriptionService } from "./mockSubscriptionService";
import { auth } from "../config/firebase";

// Get from environment variables
const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_...";

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Subscription plans configuration - Update these with your actual Stripe Price IDs
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out our AI tools",
    price: 0,
    interval: "month",
    features: [
      "10 AI generations per month",
      "Basic content types",
      "Standard support",
    ],
    limits: {
      generations: 10,
      canvas: false,
      analytics: false,
      customPersonas: false,
      batchGeneration: false,
      apiAccess: false,
    },
    stripePriceId: "",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For content creators and small businesses",
    price: 19,
    interval: "month",
    features: [
      "500 AI generations per month",
      "All content types",
      "Visual Canvas",
      "Content Analytics",
      "Custom AI Personas",
      "Priority support",
    ],
    limits: {
      generations: 500,
      canvas: true,
      analytics: true,
      customPersonas: true,
      batchGeneration: false,
      apiAccess: false,
    },
    stripePriceId: "price_pro_monthly_19", // Replace with your actual Pro plan price ID
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    description: "For agencies and growing teams",
    price: 49,
    interval: "month",
    features: [
      "Unlimited AI generations",
      "All Pro features",
      "Batch content generation",
      "API access",
      "Team collaboration",
      "Custom integrations",
      "Dedicated support",
    ],
    limits: {
      generations: -1, // unlimited
      canvas: true,
      analytics: true,
      customPersonas: true,
      batchGeneration: true,
      apiAccess: true,
    },
    stripePriceId: "price_business_monthly_49", // Replace with your actual Business plan price ID
  },
];

export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
};

export const getCurrentPlan = (planId?: string): SubscriptionPlan => {
  return getPlanById(planId || "free") || SUBSCRIPTION_PLANS[0];
};

// Stripe checkout session creation - Following Stripe documentation
export const createCheckoutSession = async (
  priceId: string,
  userId: string,
) => {
  try {
    // First, try to use real Firebase Functions
    try {
      console.log("🔄 Attempting to call Firebase Function for checkout...");
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const functions = getFunctions();
      const createCheckoutSessionFn = httpsCallable(
        functions,
        "createCheckoutSession",
      );

      console.log("📞 Calling createCheckoutSession function with:", {
        priceId,
        userId,
      });
      const result = await createCheckoutSessionFn({
        priceId,
        userId,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });

      console.log("✅ Firebase Function response:", result.data);
      const data = result.data as any;

      if (data.url) {
        // Redirect to Stripe Checkout - Following Stripe documentation
        console.log("🚀 Redirecting to Stripe Checkout:", data.url);
        window.location.href = data.url;
        return;
      } else if (data.sessionId) {
        // Use Stripe.js to redirect - Alternative method
        const stripe = await getStripe();
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });
          if (error) {
            throw error;
          }
        }
        return;
      }

      throw new Error("No checkout URL or session ID returned");
    } catch (functionError: any) {
      // If Firebase Functions are not deployed or configured, fall back to enhanced mock
      console.warn("Firebase Function error:", functionError);

      if (
        functionError.code === "functions/not-found" ||
        functionError.code === "functions/internal" ||
        functionError.code === "internal" ||
        functionError.message?.includes("not-found") ||
        functionError.message?.includes("CORS") ||
        functionError.message?.includes("INTERNAL") ||
        functionError.toString().includes("INTERNAL")
      ) {
        console.warn(
          "🔄 Firebase Functions not available or misconfigured, using enhanced mock checkout...",
        );

        // Show user-friendly message about development mode
        const plan = SUBSCRIPTION_PLANS.find(
          (p) => p.stripePriceId === priceId,
        );
        if (plan) {
          console.log(`💰 Initiating mock checkout for ${plan.name} plan...`);
        }

        return await createEnhancedMockCheckout(priceId, userId);
      }
      throw functionError;
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// Enhanced mock checkout that simulates a more realistic flow
const createEnhancedMockCheckout = async (priceId: string, userId: string) => {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.stripePriceId === priceId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  // Show a brief notification about development mode
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1e40af;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
  notification.innerHTML = `
    🚀 <strong>Development Mode</strong><br>
    Using mock checkout for ${plan.name} plan
  `;
  document.body.appendChild(notification);

  // Remove notification after 4 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 4000);

  // Create a more realistic checkout simulation
  const checkoutUrl = createMockCheckoutPage(plan);

  // Open in a new window to simulate Stripe checkout
  const checkoutWindow = window.open(
    checkoutUrl,
    "stripe-checkout",
    "width=600,height=700,scrollbars=yes",
  );

  if (!checkoutWindow) {
    // Fallback if popup is blocked
    return await createSimpleMockCheckout(plan, userId);
  }

  // Listen for the checkout completion
  return new Promise<void>((resolve, reject) => {
    const checkInterval = setInterval(() => {
      try {
        if (checkoutWindow.closed) {
          clearInterval(checkInterval);
          // Check if payment was completed (this would be set by the mock checkout page)
          const paymentCompleted = localStorage.getItem("mockPaymentCompleted");
          if (paymentCompleted === "true") {
            localStorage.removeItem("mockPaymentCompleted");
            mockSubscriptionService.simulateUpgrade(userId, plan.id);

            // Simulate successful checkout redirect
            setTimeout(() => {
              window.location.href = `${window.location.origin}/billing?success=true&session_id=mock_session_${Date.now()}`;
            }, 500);

            resolve();
          } else {
            reject(new Error("Payment canceled by user"));
          }
        }
      } catch (e) {
        // Cross-origin error means window is still open
      }
    }, 1000);

    // Timeout after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!checkoutWindow.closed) {
        checkoutWindow.close();
      }
      reject(new Error("Checkout timeout"));
    }, 600000);
  });
};

// Create a mock checkout page URL - Enhanced with Stripe-like design
const createMockCheckoutPage = (plan: SubscriptionPlan): string => {
  const checkoutData = encodeURIComponent(
    JSON.stringify({
      planName: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: plan.features,
    }),
  );

  return `data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mock Stripe Checkout</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .dev-banner { background: #1e40af; color: white; padding: 8px; text-align: center; font-size: 12px; margin-bottom: 20px; border-radius: 4px; }
            .checkout-container { max-width: 400px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .plan-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #635bff; }
            .price { font-size: 2em; font-weight: bold; color: #333; }
            .features { list-style: none; padding: 0; margin: 20px 0; }
            .features li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .features li:before { content: "✓"; color: #28a745; font-weight: bold; margin-right: 8px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: 500; color: #32325d; }
            input { width: 100%; padding: 12px; border: 1px solid #e6ebf1; border-radius: 4px; font-size: 16px; transition: border-color 0.2s; }
            input:focus { outline: none; border-color: #635bff; box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.1); }
            .pay-button { width: 100%; background: #635bff; color: white; border: none; padding: 15px; border-radius: 4px; font-size: 16px; cursor: pointer; margin: 10px 0; font-weight: 500; transition: background-color 0.2s; }
            .pay-button:hover { background: #5849e6; }
            .pay-button:disabled { background: #a7a7a7; cursor: not-allowed; }
            .cancel-button { width: 100%; background: #6c757d; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; }
            .security-note { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
            .powered-by { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            .powered-by img { width: 40px; vertical-align: middle; margin-left: 5px; }
        </style>
    </head>
    <body>
        <div class="dev-banner">
            🚀 <strong>Development Mode</strong> - This is a mock checkout simulation
        </div>
        
        <div class="checkout-container">
            <div class="header">
                <h2>🔒 Complete your order</h2>
                <p style="color: #666; margin: 0;">Powered by Mock Stripe</p>
            </div>
            
            <div class="plan-info">
                <h3>${plan.name} Plan</h3>
                <div class="price">$${plan.price}/${plan.interval}</div>
                <ul class="features">
                    ${plan.features.map((f) => `<li>${f}</li>`).join("")}
                </ul>
            </div>

            <form onsubmit="completePayment(event)">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" value="user@example.com" required>
                </div>
                
                <div class="form-group">
                    <label>Card information</label>
                    <input type="text" placeholder="1234 1234 1234 1234" maxlength="19" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <input type="text" placeholder="MM / YY" maxlength="5" required>
                    </div>
                    <div class="form-group">
                        <input type="text" placeholder="CVC" maxlength="3" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Cardholder name</label>
                    <input type="text" placeholder="Full name on card" required>
                </div>

                <button type="submit" class="pay-button" id="payButton">
                    Subscribe to ${plan.name} - $${plan.price}
                </button>
                
                <button type="button" class="cancel-button" onclick="cancelPayment()">
                    Cancel
                </button>
            </form>

            <div class="security-note">
                🛡️ This is a mock checkout for development purposes.<br>
                No real payment will be processed.
            </div>
            
            <div class="powered-by">
                Powered by <strong>Stripe</strong> (Mock)
            </div>
        </div>

        <script>
            function completePayment(event) {
                event.preventDefault();
                
                // Simulate processing
                const button = document.getElementById('payButton');
                button.textContent = 'Processing...';
                button.disabled = true;
                
                setTimeout(() => {
                    button.textContent = '✓ Payment successful!';
                    localStorage.setItem('mockPaymentCompleted', 'true');
                    
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                }, 2000);
            }
            
            function cancelPayment() {
                localStorage.setItem('mockPaymentCompleted', 'false');
                window.close();
            }
            
            // Auto-format card number
            document.querySelector('input[placeholder*="1234"]').addEventListener('input', function(e) {
                let value = e.target.value.replace(/\\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                e.target.value = value;
            });
            
            // Auto-format expiry
            document.querySelector('input[placeholder="MM / YY"]').addEventListener('input', function(e) {
                let value = e.target.value.replace(/\\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0,2) + ' / ' + value.substring(2,4);
                }
                e.target.value = value;
            });
        </script>
    </body>
    </html>`;
};

// Simple fallback if popup is blocked
const createSimpleMockCheckout = async (
  plan: SubscriptionPlan,
  userId: string,
) => {
  const shouldProceed = window.confirm(
    `🔒 Stripe Checkout (Mock)\n\n` +
      `Plan: ${plan.name}\n` +
      `Price: $${plan.price}/${plan.interval}\n\n` +
      `Features:\n${plan.features.map((f) => `• ${f}`).join("\n")}\n\n` +
      `This is a development mock. Click OK to simulate successful payment, or Cancel to abort.\n\n` +
      `(In production, this would redirect to real Stripe checkout)`,
  );

  if (shouldProceed) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    mockSubscriptionService.simulateUpgrade(userId, plan.id);

    // Simulate redirect to success page
    window.location.href = `${window.location.origin}/billing?success=true&session_id=mock_session_${Date.now()}`;
  } else {
    throw new Error("Payment canceled by user");
  }
};

// Customer portal for managing billing - Real implementation
export const redirectToCustomerPortal = async (customerId: string) => {
  try {
    // Import Firebase Functions
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions();
    const createPortalSessionFn = httpsCallable(
      functions,
      "createPortalSession",
    );

    console.log("Opening real Stripe customer portal for", customerId);

    // Call Firebase Function to create portal session
    const result = await createPortalSessionFn({
      customerId,
      returnUrl: `${window.location.origin}/billing`,
    });

    const data = result.data as any;

    if (!data.url) {
      throw new Error("No portal URL returned from server");
    }

    // Redirect to Stripe Customer Portal
    window.location.href = data.url;
  } catch (error) {
    console.error("Error creating portal session:", error);

    // Fallback to mock for development if Firebase Functions aren't deployed
    if (
      error.code === "functions/not-found" ||
      error.message.includes("not-found")
    ) {
      console.warn("Firebase Functions not deployed, using mock fallback");
      return createMockPortalSession();
    }

    throw error;
  }
};

// Mock fallback for development
const createMockPortalSession = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const options = [
    "Cancel Subscription (Reset to Free)",
    "Clear All Data",
    "Close",
  ];

  const choice = window.prompt(
    `⚠️ Development Mode - Mock Portal\n\n` +
      `Choose action:\n` +
      `0 - ${options[0]}\n` +
      `1 - ${options[1]}\n` +
      `2 - ${options[2]}\n\n` +
      `Enter number (0-2):\n\n` +
      `To enable real portal, deploy Firebase Functions`,
  );

  switch (choice) {
    case "0":
      mockSubscriptionService.resetToFree(user.uid);
      break;
    case "1":
      mockSubscriptionService.clearAllData(user.uid);
      break;
    case "2":
    case null:
      break;
    default:
      alert("Invalid choice. No action taken.");
  }
};
