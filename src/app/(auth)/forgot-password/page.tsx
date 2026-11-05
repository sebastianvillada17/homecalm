import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Recuperar acceso" };

export default function ForgotPasswordPage() {
  return <AuthPage mode="forgot" />;
}
