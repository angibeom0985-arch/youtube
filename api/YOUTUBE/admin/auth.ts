import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  validateAdminCredentials,
} from "../../_lib/adminAuth.js";

const parseBody = (req: VercelRequest) => {
  if (!req.body) return null;
  if (typeof req.body == "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return req.body;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = parseBody(req);
  const action = body?.action; // 'login' or 'logout'

  try {
    if (action === "login") {
      // 로그인 처리
      const username = body?.username || "";
      const password = body?.password || "";

      const isValid = validateAdminCredentials(username, password);
      if (!isValid) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      const token = createSessionToken(username);
      setSessionCookie(res, token);
      res.status(200).json({ ok: true });
    } else if (action === "logout") {
      // 로그아웃 처리
      clearSessionCookie(res);
      res.status(200).json({ ok: true });
    } else {
      res.status(400).json({ error: "invalid_action" });
    }
  } catch (error: any) {
    console.error("Admin auth failed", error);
    res.status(500).json({ error: "auth_error" });
  }
}
