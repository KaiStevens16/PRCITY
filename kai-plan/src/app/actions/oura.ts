"use server";

import { revalidatePath } from "next/cache";
import { syncOuraAllDefaultWindow } from "@/lib/oura-sync";

export async function syncOuraStepsAction(): Promise<void> {
  await syncOuraAllDefaultWindow();
  revalidatePath("/");
  revalidatePath("/steps");
  revalidatePath("/sleep");
}

export async function syncOuraSleepAction(): Promise<void> {
  await syncOuraAllDefaultWindow();
  revalidatePath("/");
  revalidatePath("/steps");
  revalidatePath("/sleep");
}
