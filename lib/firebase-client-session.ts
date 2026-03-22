"use client";

import { signInWithCustomToken, type User } from "firebase/auth";

import { firebaseClientAuth } from "@/lib/firebase-client";

let firebaseClientSessionPromise: Promise<User | null> | null = null;

export async function ensureFirebaseClientSession() {
  if (firebaseClientAuth.currentUser) {
    return firebaseClientAuth.currentUser;
  }

  if (!firebaseClientSessionPromise) {
    firebaseClientSessionPromise = fetch("/api/firebase-auth/token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not initialize Firebase client session.");
        }

        return response.json() as Promise<{ token: string }>;
      })
      .then(async ({ token }) => {
        const credentials = await signInWithCustomToken(firebaseClientAuth, token);
        return credentials.user;
      })
      .finally(() => {
        firebaseClientSessionPromise = null;
      });
  }

  return firebaseClientSessionPromise;
}
