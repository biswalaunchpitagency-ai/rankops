import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, useSession } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

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

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");

    const { error } = await signIn.email(data);

    if (error) {
      setServerError(error.message ?? "Login failed");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-sans">
      <div className="w-full max-w-[380px] px-4 animate-in-page">
        <div className="flex flex-col items-center mb-8">
          <div className="h-10 w-10 rounded-sm bg-[#111111] dark:bg-[#ffffff] flex items-center justify-center mb-5">
            <span className="text-[#ffffff] dark:text-[#111111] font-display text-xl font-normal">L</span>
          </div>
          <h1 className="font-display text-3xl font-normal tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1.5">
            Sign in to your Launchpit Agency account
          </p>
        </div>
        <Card className="border border-border rounded-sm shadow-none bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Sign in</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && (
                <ErrorAlert message={serverError} className="mb-4" />
              )}
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="email" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] h-9"
                    {...register("email")}
                  />
                  {errors.email && (
                    <ErrorMessage message={errors.email.message} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] h-9"
                    {...register("password")}
                  />
                  {errors.password && (
                    <ErrorMessage message={errors.password.message} />
                  )}
                </div>
                <Button
                  type="submit"
                  className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2.5 w-full mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
