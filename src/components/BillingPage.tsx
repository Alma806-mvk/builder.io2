import React, { useEffect, useState } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  redirectToCustomerPortal,
} from "../services/stripeService";
import {
  CreditCardIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "./IconComponents";
import { auth } from "../config/firebase";
import LoadingSpinner from "./LoadingSpinner";

const BillingPage: React.FC = () => {
  const { billingInfo, loading, refreshBilling } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    // Check for success/cancel params from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const canceled = urlParams.get("canceled");

    if (success) {
      // Refresh billing info after successful payment
      refreshBilling();
      // You might want to show a success message here
    }

    if (canceled) {
      // Handle canceled payment
      console.log("Payment was canceled");
    }
  }, [refreshBilling]);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan || !plan.stripePriceId) return;

    setIsProcessing(true);
    try {
      await createCheckoutSession(plan.stripePriceId, user.uid);
    } catch (error) {
      console.error("Error upgrading:", error);
      alert("Error starting upgrade process. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    if (!billingInfo?.subscription?.stripeCustomerId) return;

    setIsProcessing(true);
    try {
      await redirectToCustomerPortal(billingInfo.subscription.stripeCustomerId);
    } catch (error) {
      console.error("Error opening customer portal:", error);
      alert("Error opening billing management. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-white">Error loading billing information</div>
      </div>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS.find(
    (p) => p.id === (billingInfo.subscription?.planId || "free"),
  )!;
  const usagePercentage =
    currentPlan.limits.generations === -1
      ? 0
      : (billingInfo.usage.generations / currentPlan.limits.generations) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">
            Billing & Subscription
          </h1>

          {/* Current Plan Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Current Plan
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-sky-400">
                    {currentPlan.name}
                  </span>
                  {billingInfo.status === "active" && (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                  {billingInfo.status === "canceled" && (
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                      Canceled
                    </span>
                  )}
                </div>
              </div>

              {billingInfo.subscription && (
                <button
                  onClick={handleManageBilling}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <CreditCardIcon className="h-4 w-4" />
                  <span>Manage Billing</span>
                </button>
              )}
            </div>

            {billingInfo.subscription && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Next billing date</p>
                    <p className="text-white font-medium">
                      {new Date(
                        billingInfo.subscription.currentPeriodEnd,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {billingInfo.daysLeft && (
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircleIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Days remaining</p>
                      <p className="text-white font-medium">
                        {billingInfo.daysLeft} days
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-slate-400 text-sm">{currentPlan.description}</p>
          </div>

          {/* Usage Stats */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Usage This Month
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">AI Generations</span>
                  <span className="text-sm text-white">
                    {billingInfo.usage.generations} /{" "}
                    {currentPlan.limits.generations === -1
                      ? "∞"
                      : currentPlan.limits.generations}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usagePercentage > 90
                        ? "bg-red-500"
                        : usagePercentage > 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              </div>

              {usagePercentage > 80 && currentPlan.id === "free" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ You're approaching your monthly limit. Consider upgrading
                    to continue creating content.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Available Plans */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Available Plans
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrentPlan = plan.id === currentPlan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative border rounded-lg p-6 ${
                      plan.popular
                        ? "border-sky-500 ring-2 ring-sky-500/20"
                        : "border-slate-600"
                    } ${isCurrentPlan ? "bg-slate-700/30" : "bg-slate-700/10"}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {plan.name}
                      </h4>
                      <div className="mb-2">
                        <span className="text-3xl font-bold text-white">
                          ${plan.price}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-slate-400">
                            /{plan.interval}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">
                        {plan.description}
                      </p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center text-sm text-slate-300"
                        >
                          <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-2 px-4 bg-slate-600 text-slate-400 rounded-lg font-medium"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isProcessing || plan.id === "free"}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          plan.id === "free"
                            ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                            : plan.popular
                              ? "bg-sky-600 hover:bg-sky-500 text-white"
                              : "bg-slate-600 hover:bg-slate-500 text-white"
                        }`}
                      >
                        {plan.id === "free"
                          ? "Downgrade via Support"
                          : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
