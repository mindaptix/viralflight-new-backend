"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { requireSuperAdmin } from "../lib/auth";

export async function createCommunityAction(formData: FormData) {
  await requireSuperAdmin();
  const payload = await getPayload({ config });
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  await payload.create({
    collection: "communities",
    data: {
      name: String(formData.get("name") || "").trim(),
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

  revalidatePath("/communities");
  revalidatePath("/system");
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
}
