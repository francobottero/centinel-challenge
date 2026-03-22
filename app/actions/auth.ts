"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or less."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type RegisterState = {
  error?: string;
};

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid form submission.",
    };
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        confirmed: false,
        password: await hash(parsed.data.password, 12),
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return {
        error: "An account with this email already exists.",
      };
    }

    return {
      error: "We could not create your account. Please try again.",
    };
  }

  redirect("/login");
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
