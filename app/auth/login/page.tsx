import React from "react";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export interface LoginProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginProps) {
  const { error, message } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 flex flex-col gap-6 shadow-modal">
        {/* Header logo */}
        <div className="flex flex-col items-center text-center gap-1.5 select-none">
          <div className="w-10 h-10 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Sign in to Milestone
          </h1>
          <p className="font-body-sm text-body-sm text-muted-foreground">
            Escrow-backed project management platform
          </p>
        </div>

        {/* Errors display */}
        {error && (
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success/Verification Message display */}
        {message && (
          <div className="p-4 rounded-lg bg-primary-container/10 border border-primary/20 text-on-surface text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">mail</span>
            <span>{message}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form action={signInAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@domain.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="font-body-sm text-xs text-primary font-semibold hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <Separator />

        <div className="text-center font-body-sm text-xs text-muted-foreground">
          New to Milestone?{" "}
          <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </Card>
    </div>
  );
}

// Separator helper to avoid importing another file for simple line spacing
function Separator() {
  return <div className="h-px w-full bg-outline-variant/30 shrink-0" />;
}
