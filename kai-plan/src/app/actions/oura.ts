"use server";

import { revalidatePath } from "next/cache";
import { syncOuraStepsDefaultWindow } from "@/lib/oura-sync";

export async function syncOuraStepsAction(): Promise<void> {
  await syncOuraStepsDefaultWindow();
  revalidatePath("/");
  revalidatePath("/steps");
}
