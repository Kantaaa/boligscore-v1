import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// TODO(auth-onboarding): user profile fields, sign-out, account deletion.

export default function MegPage() {
  return (
    <section aria-labelledby="meg-heading" className="space-y-6">
      <h1 id="meg-heading" className="text-2xl font-semibold">
        Meg
      </h1>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tema</h2>
        <p className="text-sm text-fg-muted">
          Velg om appen skal vises i lyst eller mørkt tema.
        </p>
        <ThemeToggle />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">App</h2>
        <p className="text-sm text-fg-muted">
          Installer Boligscore som app på enheten din.
        </p>
        <InstallAppButton />
      </div>
    </section>
  );
}
