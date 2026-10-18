/** Navigation accepts only the independent UUID, never a private auth/profile record ID. */
import { z } from "@/lib/zod";

export const publicProfileSchema = z.object({ publicId: z.uuid() });
