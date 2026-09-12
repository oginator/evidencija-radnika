import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="relative overflow-hidden bg-linear-to-r from-[#066a96] via-[#0a8ec8] to-[#7dcef0] px-4 pb-16 pt-10">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-white/25" />
        <div className="relative mx-auto flex max-w-md justify-center">
          <BrandLogo size="xl" plated />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 -translate-y-8 justify-center px-4 pb-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
