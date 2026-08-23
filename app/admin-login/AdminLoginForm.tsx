"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { adminLoginAction } from "@/app/admin/actions";

export function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await adminLoginAction({ email, password });
      if (response.success) {
        // Force refresh layout and route
        router.refresh();
        router.push("/admin");
      } else {
        setError(response.error || "Invalid credentials.");
        setIsSubmitting(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Email Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="admin@example.com"
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low border border-outline-variant text-sm text-on-surface placeholder:text-secondary-custom/60 focus:outline-none focus:border-primary transition-all"
            required
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
            mail
          </span>
        </div>
      </div>

      {/* Password Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder="••••••••••••"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low border border-outline-variant text-sm text-on-surface placeholder:text-secondary-custom/60 focus:outline-none focus:border-primary transition-all"
            required
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
            lock
          </span>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-all flex items-center justify-center h-8 w-8 rounded-full hover:bg-outline-variant/20"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {error && (
        <div className="p-3 rounded-xl bg-error/5 border border-error/20 flex gap-2.5 items-start mt-1 animate-shake">
          <span className="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5">
            error
          </span>
          <p className="text-xs text-error leading-relaxed">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">
              progress_activity
            </span>
            Authenticating...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">
              login
            </span>
            Sign In to Ops Panel
          </>
        )}
      </button>
    </form>
  );
}
