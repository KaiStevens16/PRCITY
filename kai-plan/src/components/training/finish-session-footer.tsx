"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeSession } from "@/app/actions/training";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Props = {
  sessionId: string;
};

export function FinishSessionFooter({ sessionId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onFinish() {
    setPending(true);
    await completeSession({ sessionId });
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="sticky bottom-4 z-20 mt-8 flex justify-center">
      <Button
        size="lg"
        className="w-full max-w-md gap-2 shadow-lg shadow-black/25"
        disabled={pending}
        onClick={onFinish}
      >
        <CheckCircle2 className="h-4 w-4" />
        {pending ? "Saving…" : "Finish workout"}
      </Button>
    </div>
  );
}
