import { z } from "zod";

/** The initialization action accepts no client-controlled progression data. */
export const initializeProgressionSchema = z.object({}).strict();

