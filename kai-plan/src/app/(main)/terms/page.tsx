import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms · PR CITY",
  description: "Terms of use for PR CITY",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm text-muted-foreground">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">Terms of use</h1>
      <p>
        PR CITY is provided as-is for personal use. You are responsible for how you use training
        and health information shown in the app. Nothing here is medical advice.
      </p>
      <p>
        Integrations (such as Oura) are subject to those providers&apos; terms and API policies.
        You may disconnect or revoke access at any time through the provider or by removing stored
        credentials from your deployment.
      </p>
      <p className="text-xs text-muted-foreground/70">Last updated April 2026.</p>
    </div>
  );
}
