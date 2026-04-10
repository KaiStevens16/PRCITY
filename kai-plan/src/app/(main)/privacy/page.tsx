import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · PR CITY",
  description: "Privacy policy for PR CITY",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm text-muted-foreground">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">Privacy</h1>
      <p>
        PR CITY is a personal training app. If you connect third-party services (for example Oura),
        we store only what is needed to show your data in the app—such as OAuth tokens and daily
        activity summaries you sync—on infrastructure you control (for example your Supabase
        project).
      </p>
      <p>
        This site does not sell your data. It is not used for advertising. Contact the operator at
        the email listed on your Oura developer application if you have questions.
      </p>
      <p className="text-xs text-muted-foreground/70">Last updated April 2026.</p>
    </div>
  );
}
