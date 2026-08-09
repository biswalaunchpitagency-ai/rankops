import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router";
import { signIn, useSession } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ErrorAlert";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized_email") {
      setErrorMessage("Your email is not authorized. Please ask an administrator to invite you.");
    } else if (errorParam) {
      setErrorMessage("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading...
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsSigningIn(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-sans">
      <div className="w-full max-w-[380px] px-4 animate-in-page">
        <div className="flex flex-col items-center mb-8">
          <div className="h-10 w-10 rounded-sm bg-[#111111] dark:bg-[#ffffff] flex items-center justify-center mb-5">
            <span className="text-[#ffffff] dark:text-[#111111] font-display text-xl font-normal">L</span>
          </div>
          <h1 className="font-display text-3xl font-normal tracking-tight text-foreground">
            Welcome
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1.5">
            Sign in to Launchpit Agency
          </p>
        </div>
        <Card className="border border-border rounded-sm shadow-none bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Sign in</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Single Sign-On access for team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && <ErrorAlert message={errorMessage} className="mb-4" />}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none py-2.5 flex items-center justify-center gap-2.5"
            >
              {isSigningIn ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.7 7.4l3.6 2.8C6.2 7.4 8.9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.5l3.6 2.8c2.1-2 3.8-4.9 3.8-8.5z" />
                  <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.7 7.4C.6 9.6 0 12 0 14.7s.6 5.1 1.7 7.3l3.6-2.8c-.2-.7-.4-1.5-.4-2.3z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-2.9l-3.6-2.8c-1.1.7-2.5 1.2-4.4 1.2-3.1 0-5.8-2.4-6.7-5.4L1.7 16C3.5 19.8 7.4 23 12 23z" />
                </svg>
              )}
              {isSigningIn ? "Redirecting to Google..." : "Sign in with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
