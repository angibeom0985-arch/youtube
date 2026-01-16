import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser, supabaseAdmin } from "../../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Admin client unavailable" });
  }

  const token = authHeader.replace("Bearer ", "");
  const authResult = await getSupabaseUser(token);
  const user = authResult.user;

  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (profileError) {
    console.error("Profile delete error:", profileError);
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("User delete error:", deleteError);
    return res.status(500).json({ error: "Account deletion failed" });
  }

  return res.status(200).json({ success: true });
}
