import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3, "Benutzername ist zu kurz"),
  password: z.string().min(6, "Passwort ist zu kurz"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Aktuelles Passwort fehlt"),
  newPassword: z.string().min(6, "Neues Passwort ist zu kurz"),
});

export const destinationSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  address: z.string().trim().optional().or(z.literal("")),
  googleMapsLink: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  favorite: z.boolean().optional(),
  visited: z.boolean().optional(),
  privateNotes: z.string().trim().optional().or(z.literal("")),
  tagIds: z.array(z.string()).optional(),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
});
