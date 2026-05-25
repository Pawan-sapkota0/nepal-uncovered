import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable, profilesTable, userRolesTable,
  refreshTokensTable, emailVerificationTokensTable, passwordResetTokensTable,
} from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, generateRefreshToken, hashToken, generateOneTimeToken } from "../lib/jwt";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod";

const router: IRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function setRefreshCookie(res: any, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }
  const { email, password, name } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "email_taken", message: "Email already registered" } });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), passwordHash }).returning();
  await db.insert(profilesTable).values({ userId: user.id, name });
  await db.insert(userRolesTable).values([
    { userId: user.id, role: "viewer" },
    { userId: user.id, role: "contributor" },
  ]);

  const { raw, hash, expiresAt } = generateRefreshToken();
  await db.insert(refreshTokensTable).values({
    userId: user.id, tokenHash: hash, expiresAt,
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
  });

  const roles = ["viewer", "contributor"];
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles });

  setRefreshCookie(res, raw);
  req.log.info({ userId: user.id }, "User signed up");
  res.status(201).json({ accessToken, user: { id: user.id, email: user.email, name, roles } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: { code: "invalid_credentials", message: "Invalid email or password" } });
    return;
  }
  if (user.disabledAt) {
    res.status(403).json({ error: { code: "account_disabled", message: "Account is disabled" } });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: { code: "invalid_credentials", message: "Invalid email or password" } });
    return;
  }

  const userRoles = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, user.id));
  const roles = [...new Set(userRoles.map((r) => r.role))];

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));

  const { raw, hash, expiresAt } = generateRefreshToken();
  await db.insert(refreshTokensTable).values({
    userId: user.id, tokenHash: hash, expiresAt,
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
  });

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles });
  setRefreshCookie(res, raw);
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ accessToken, user: { id: user.id, email: user.email, name: profile?.name, roles } });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    res.status(401).json({ error: { code: "unauthorized", message: "No refresh token" } });
    return;
  }

  const tokenHash = hashToken(rawToken);
  const [stored] = await db.select().from(refreshTokensTable).where(eq(refreshTokensTable.tokenHash, tokenHash));

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired refresh token" } });
    return;
  }

  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, stored.id));

  const { raw, hash, expiresAt } = generateRefreshToken();
  const [newToken] = await db.insert(refreshTokensTable).values({
    userId: stored.userId, tokenHash: hash, expiresAt,
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
    replacedBy: stored.id,
  }).returning();

  const userRoles = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, stored.userId));
  const roles = [...new Set(userRoles.map((r) => r.role))];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId));

  const accessToken = signAccessToken({ sub: stored.userId, email: user.email, roles });
  setRefreshCookie(res, raw);
  res.json({ accessToken });
});

router.post("/auth/logout", authenticate, async (req, res): Promise<void> => {
  const rawToken = req.cookies?.refresh_token;
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.tokenHash, tokenHash));
  }
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.sendStatus(204);
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  // Always return 200 to prevent email enumeration
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, (email ?? "").toLowerCase()));
  if (user) {
    const { hash, expiresAt } = generateOneTimeToken();
    await db.insert(passwordResetTokensTable).values({ userId: user.id, tokenHash: hash, expiresAt });
    req.log.info({ userId: user.id }, "Password reset token issued (email stubbed)");
  }
  res.json({ message: "If that email is registered you will receive a reset link." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: { code: "validation_error", message: "Token and newPassword (min 8 chars) required" } });
    return;
  }
  const tokenHash = hashToken(token);
  const [record] = await db.select().from(passwordResetTokensTable)
    .where(and(eq(passwordResetTokensTable.tokenHash, tokenHash), gt(passwordResetTokensTable.expiresAt, new Date())));
  if (!record || record.usedAt) {
    res.status(400).json({ error: { code: "invalid_token", message: "Invalid or expired reset token" } });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, record.userId));
  await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, record.id));
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(and(eq(refreshTokensTable.userId, record.userId)));
  res.json({ message: "Password reset successfully" });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const userRoles = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, userId));
  const roles = [...new Set(userRoles.map((r) => r.role))];
  if (!user || !profile) {
    res.status(404).json({ error: { code: "not_found", message: "User not found" } });
    return;
  }
  res.json({
    id: user.id, email: user.email, name: profile.name,
    bio: profile.bio, avatarUrl: profile.avatarUrl,
    contributionsCount: profile.contributionsCount,
    roles, emailVerified: !!user.emailVerifiedAt,
    joinedAt: profile.joinedAt,
  });
});

router.patch("/auth/me", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const { name, bio } = req.body;
  await db.update(profilesTable).set({
    ...(name != null ? { name } : {}),
    ...(bio != null ? { bio } : {}),
  }).where(eq(profilesTable.userId, userId));
  res.json({ message: "Profile updated" });
});

export default router;
