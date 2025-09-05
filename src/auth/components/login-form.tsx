"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoBlanco from "@/assets/logos/blanco/logo";
import { signUp } from "@/auth/api/client";
import { HOME } from "@/consts/routes";
import { useRateLimitHandler } from "@/components/rate-limit-handler";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { executeWithRateLimit } = useRateLimitHandler();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    await executeWithRateLimit(
      () => signUp({ email, password }),
      {
        onSuccess: () => {
          router.push(HOME);
        },
        onError: (error) => {
          setError(error instanceof Error ? error.message : "Ocurrió un error");
        },
        fallbackErrorMessage: "Error al iniciar sesión"
      }
    );

    setIsLoading(false);
  };

  return (
    <>
      <header className="max-w-2xl mx-auto w-full py-11 flex justify-center items-center pt-8">
        <LogoBlanco />
      </header>
      <section className="max-w-2xl mx-auto w-full px-4 pt-11">
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-12">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                required
                autoComplete={"off"}
                id="email"
                placeholder="m@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                {/* <Link
                  href="/auth/forgot-password"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link> */}
              </div>
              <Input
                required
                id="password"
                placeholder="********"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full h-14"
              disabled={isLoading}
              loading={isLoading}
              loadingText="Un momento"
              type="submit"
            >
              Iniciar Sesión
            </Button>
          </div>
          {/* <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              Sign up
            </Link>
          </div> */}
        </form>
      </section>
    </>
  );
}
