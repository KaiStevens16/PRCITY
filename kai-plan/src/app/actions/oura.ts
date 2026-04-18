"use server";

import { revalidatePath } from "next/cache";
import { syncOuraSleepDefaultWindow, syncOuraStepsDefaultWindow } from "@/lib/oura-sync";

export async function syncOuraStepsAction(): Promise<void> {
  await syncOuraStepsDefaultWindow();
  revalidatePath("/");
  revalidatePath("/steps");
  revalidatePath("/sleep");
}

export async function syncOuraSleepAction(): Promise<void> {
  await syncOuraSleepDefaultWindow();
  revalidatePath("/");
  revalidatePath("/sleep");
}
