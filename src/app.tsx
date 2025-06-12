import React, { useState, useEffect } from "react";
import { auth } from "./config/firebase";
import { signOut } from "firebase/auth";
import { App as MainApp } from "../App";
import Auth from "./components/Auth";
import {
  UserCircleIcon,
  ChevronDownIcon,
  CreditCardIcon,
} from "./components/IconComponents";
import LoadingSpinner from "./components/LoadingSpinner";
import {
  SubscriptionProvider,
  useSubscription,
} from "./context/SubscriptionContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import BillingPage from "./components/BillingPage";
import AccountPage from "./components/AccountPage";
import OnboardingSurvey from "./components/OnboardingSurvey";
import DevTools from "./components/DevTools";
import {
  HeroSection,
  TestimonialsSection,
  PricingPreview,
} from "./components/LandingPageComponents";
import { FloatingHelp } from "./components/FloatingComponents";
import "./components/Auth.css";

function AppContent() {
  const { user, loading, needsOnboarding, completeOnboarding } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState<"app" | "billing" | "account">(
    "app",
  );
  const [forceLoaded, setForceLoaded] = useState(false);
  const { billingInfo } = useSubscription();

  // Fallback: Force loading to complete after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log(
        "AppContent: Force loading timeout - bypassing loading state",
      );
      setForceLoaded(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSignInClick = () => {
    setShowAuth(true);
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
  };

  if (loading && !forceLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-slate-400 mt-4">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (user && needsOnboarding) {
    return <OnboardingSurvey onComplete={completeOnboarding} />;
  }

  if (!user && !showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black">
        {/* Header with Sign In button */}
        <header className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <h1 className="text-xl font-bold text-white">
                  Social Content AI Studio
                </h1>
              </div>

              <button
                onClick={handleSignInClick}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </header>

        {/* Enhanced Landing Page */}
        <HeroSection onSignInClick={handleSignInClick} />
        <TestimonialsSection />
        <PricingPreview onSignInClick={handleSignInClick} />

        {/* Floating Help */}
        <FloatingHelp onHelpClick={() => console.log("Help clicked")} />
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="relative">
            <button
              onClick={handleCloseAuth}
              className="absolute -top-4 -right-4 z-10 w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <Auth onAuthSuccess={handleCloseAuth} />
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, show the main app with header
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black">
      {/* Header with user menu */}
      <header className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <h1 className="text-lg font-bold text-white">
                Social Content AI Studio
              </h1>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <UserCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-sm font-medium text-white">
                      {user.displayName || "User"}
                    </p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setCurrentPage("account");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors flex items-center space-x-2"
                    >
                      <UserCircleIcon className="h-4 w-4" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage("billing");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors flex items-center space-x-2"
                    >
                      <CreditCardIcon className="h-4 w-4" />
                      <span>Billing & Usage</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Main app content */}
      {currentPage === "billing" ? (
        <div>
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => setCurrentPage("app")}
              className="text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-2 mb-4"
            >
              <span>←</span>
              <span>Back to App</span>
            </button>
          </div>
          <BillingPage />
        </div>
      ) : currentPage === "account" ? (
        <div>
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => setCurrentPage("app")}
              className="text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-2 mb-4"
            >
              <span>←</span>
              <span>Back to App</span>
            </button>
          </div>
          <AccountPage onNavigateToBilling={() => setCurrentPage("billing")} />
        </div>
      ) : (
        <MainApp />
      )}

      {/* Developer Tools - Only visible in development */}
      <DevTools />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
