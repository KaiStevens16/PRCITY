/**
 * Fixed identity for single-user (no login). Must match program_state / sessions rows.
 */
export function getSoloUserId(): string {
  const id = process.env.KAI_PLAN_USER_ID?.trim();
  if (!id) {
    throw new Error(
      "Set KAI_PLAN_USER_ID in .env.local to a UUID (see README)."
    );
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) {
    throw new Error("KAI_PLAN_USER_ID must be a valid UUID.");
  }
  return id;
}
