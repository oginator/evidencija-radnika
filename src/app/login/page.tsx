import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-x-hidden overflow-y-auto overscroll-none">
      <div className="relative shrink-0 overflow-hidden bg-linear-to-r from-[#066a96] via-[#0a8ec8] to-[#7dcef0] px-4 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))] sm:pb-12 sm:pt-10">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent to-white/25" />
        <div className="relative mx-auto flex max-w-[min(100%,20rem)] justify-center">
          <BrandLogo size="lg" plated />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:pt-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
