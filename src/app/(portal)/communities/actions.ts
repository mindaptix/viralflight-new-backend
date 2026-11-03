"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { requireSuperAdmin } from "../lib/auth";

export async function createCommunityAction(formData: FormData) {
  await requireSuperAdmin();
  const payload = await getPayload({ config });
  const name = String(formData.get("name") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  try {
    await payload.create({
      collection: "communities",
      overrideAccess: true,
      data: {
        name,
        tagline: String(formData.get("tagline") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        imageUrl: String(formData.get("imageUrl") || "").trim(),
        tags,
        baseMemberCount: Math.max(
          0,
          Number(formData.get("baseMemberCount") || 0),
        ),
        sortOrder: Number(formData.get("sortOrder") || 0),
        isActive: true,
      },
    });
  } catch (caught) {
    const details = caught as { code?: number | string; message?: string };
    const message = details.message || "Unknown database error";
    const duplicate =
      String(details.code) === "11000" ||
      /duplicate key|already exists|unique/i.test(message);

    console.error("[communities] Create failed", {
      code: details.code,
      message,
      name,
    });

    const publicMessage = duplicate
      ? `A community named “${name}” already exists. Use a different name.`
      : "The community could not be saved. Please check the fields and try again.";
    redirect(`/communities?error=${encodeURIComponent(publicMessage)}`);
  }

  revalidatePath("/communities");
  revalidatePath("/system");
  redirect("/communities?created=1");
}

export async function setCommunityStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const payload = await getPayload({ config });
  await payload.update({
    collection: "communities",
    id: String(formData.get("communityId") || ""),
    data: { isActive: String(formData.get("isActive")) === "true" },
  });
  revalidatePath("/communities");
  revalidatePath(`/communities/${String(formData.get("communityId") || "")}`);
}
