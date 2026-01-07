import { createHmac, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 12 * 60 * 60 * 1000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

type SessionPayload = {
  sub: string;
  exp: number;
};

const base64Url = (input: string) => Buffer.from(input).toString("base64url");

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const signToken = (payload: SessionPayload): string => {
  if (!ADMIN_SESSION_SECRET) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  const data = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", ADMIN_SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
};

const verifyToken = (token: string): SessionPayload | null => {
  if (!ADMIN_SESSION_SECRET) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = createHmac("sha256", ADMIN_SESSION_SECRET).update(data).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
};

const getCookie = (req: VercelRequest, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return match.split("=").slice(1).join("=");
};

export const validateAdminCredentials = (username: string, password: string): boolean => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD");
  }
  return safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);
};

export const createSessionToken = (username: string): string => {
  const payload: SessionPayload = {
    sub: username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  return signToken(payload);
};

export const setSessionCookie = (res: VercelResponse, token: string) => {
  const secure = process.env.NODE_ENV == "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}${secure}`
  );
};

export const clearSessionCookie = (res: VercelResponse) => {
  const secure = process.env.NODE_ENV == "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`
  );
};

export const requireAdmin = (req: VercelRequest): SessionPayload | null => {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return null;
  return verifyToken(token);
};
