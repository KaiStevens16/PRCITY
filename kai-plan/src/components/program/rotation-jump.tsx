"use client";

import { useRouter } from "next/navigation";
import { setRotationIndex } from "@/app/actions/program";

type T = { id: string; name: string; rotation_order: number };

export function RotationJump({
  templates,
  currentIndex,
}: {
  templates: T[];
  currentIndex: number;
}) {
  const router = useRouter();
  const sorted = [...templates].sort((a, b) => a.rotation_order - b.rotation_order);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="rotation-jump" className="text-muted-foreground">
        Jump to
      </label>
      <select
        id="rotation-jump"
        className="h-9 max-w-xs rounded-md border border-input bg-background px-2 text-sm"
        value={currentIndex}
        onChange={async (e) => {
          await setRotationIndex(parseInt(e.target.value, 10));
          router.refresh();
        }}
      >
        {sorted.map((t) => (
          <option key={t.id} value={t.rotation_order - 1}>
            {t.rotation_order}. {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
