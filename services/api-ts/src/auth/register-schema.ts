import * as z from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(255),
  password: z.string().min(15).max(128),
});
