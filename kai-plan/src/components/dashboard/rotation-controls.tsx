"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adjustRotation } from "@/app/actions/program";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RotationControls() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={async () => {
          await adjustRotation(-1);
          router.refresh();
        }}
        title="Previous in rotation"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={async () => {
          await adjustRotation(1);
          router.refresh();
        }}
        title="Next in rotation"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
