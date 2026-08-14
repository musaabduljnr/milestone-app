import React from "react";
import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export interface SignUpProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 flex flex-col gap-6 shadow-modal">
        {/* Onboarding Wizard Header */}
        <div className="flex flex-col items-center text-center gap-1.5 select-none">
          <div className="w-10 h-10 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">fingerprint</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Create your account
          </h1>
          <p className="font-body-sm text-body-sm text-muted-foreground">
            Step 1 of 3: Setup login credentials
          </p>
        </div>

        {/* Errors Box */}
        {error && (
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form action={signUpAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Full Name
            </label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="e.g. Sarah Jenkins"
              required
              autoComplete="name"
            />
          </div>

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
            <label htmlFor="password" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Minimum 6 characters
            </span>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2">
            Continue
          </Button>
        </form>

        <Separator />

        <div className="text-center font-body-sm text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Sign In
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
