import { z } from "zod";
import { isValidTimeZone } from "@/features/progression/lib/streak-utils";

/** Validates the browser-detected IANA timezone before persistence. */
export const detectTimeZoneSchema = z.object({
  timeZone: z.string().trim().refine(isValidTimeZone, "Invalid timezone."),
}).strict();
