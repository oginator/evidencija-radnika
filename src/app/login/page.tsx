import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
