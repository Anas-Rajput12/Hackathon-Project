"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Severity } from "@/generated/prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function createIncident(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const pollutionType = formData.get("pollutionType") as string;
  const location = formData.get("location") as string;
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const severity = ((formData.get("severity") as string) || "MEDIUM") as Severity;

  if (!title || !description || !pollutionType || !location || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error("Missing required fields");
  }

  await prisma.incident.create({
    data: {
      title,
      description,
      pollutionType,
      latitude,
      longitude,
      severity,
      reportedById: session.user.id,
    },
  });

  redirect("/incidents");
}
