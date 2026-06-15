import { GradientMesh, SectionMotif } from "@dawood/shared";
import { LoginForm } from "./LoginForm";

// Public route (outside the (app) auth gate). Server component: reads the
// ?error= code and hands it to the client form.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      {/* Full-bleed atmospheric backdrop */}
      <GradientMesh />
      {/* Faint oversized pulse watermark in the trailing-top corner */}
      <SectionMotif name="pulse" size={320} className="-top-16 -end-16 opacity-[0.04]" drift />

      <div className="animate-reveal relative w-full max-w-sm">
        <LoginForm initialError={searchParams.error ?? null} />
      </div>
    </main>
  );
}
