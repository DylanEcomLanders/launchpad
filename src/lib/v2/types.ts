export type V2AppUserRole = "admin" | "cro" | "team";

/** Resolved Launchpad 2.0 identity. Shared-role-only sessions are a failure. */
export interface V2AppUser {
  id: string;
  email: string;
  name: string;
  role: V2AppUserRole;
}

export interface V2Client {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export class V2ConflictError extends Error {
  constructor(message = "This row changed since you loaded it. Reload and try again.") {
    super(message);
    this.name = "V2ConflictError";
  }
}
