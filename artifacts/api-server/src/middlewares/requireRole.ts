import type { Request, Response, NextFunction } from "express";

type Role = "viewer" | "contributor" | "moderator" | "admin";

const ROLE_HIERARCHY: Role[] = ["viewer", "contributor", "moderator", "admin"];

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: "unauthorized", message: "Authentication required" } });
      return;
    }
    const userRoles = req.user.roles as Role[];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: { code: "forbidden", message: "Insufficient permissions" } });
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: "unauthorized", message: "Authentication required" } });
      return;
    }
    const minIndex = ROLE_HIERARCHY.indexOf(minRole);
    const userRoles = req.user.roles as Role[];
    const hasRole = userRoles.some((r) => ROLE_HIERARCHY.indexOf(r) >= minIndex);
    if (!hasRole) {
      res.status(403).json({ error: { code: "forbidden", message: "Insufficient permissions" } });
      return;
    }
    next();
  };
}

export function isStaff(roles: string[]): boolean {
  return roles.includes("moderator") || roles.includes("admin");
}
