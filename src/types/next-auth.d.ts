import NextAuth, { DefaultSession } from "next-auth"
import type { BaseRole } from "@/lib/rbac"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      role: BaseRole
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    username: string
    role: BaseRole
    name: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: BaseRole
    username: string
  }
}