import { LoginForm } from "./LoginForm";

// Public route (outside the (app) auth gate). Server component: reads the
// ?error= code and hands it to the client form.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <LoginForm initialError={searchParams.error ?? null} />
    </main>
  );
}
