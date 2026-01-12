import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { envServer } from "@/lib/env.server"
import logger from "@/lib/logger"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.role) {
          return null
        }

        try {
          if (process.env.NODE_ENV !== "production") {
            logger.debug("Auth attempt", { username: credentials.username })
          }
          let user = null
          
          // Role asosida tegishli jadvaldan foydalanuvchini topish
          switch (credentials.role) {
            case "admin":
              user = await prisma.admin.findUnique({
                where: { username: credentials.username }
              })
              break
            case "accountant":
              user = await prisma.accountant.findUnique({
                where: { username: credentials.username }
              })
              break
            case "teacher":
              user = await prisma.teacher.findUnique({
                where: { username: credentials.username }
              })
              break
            case "student":
              user = await prisma.student.findUnique({
                where: { username: credentials.username }
              })
              break
            case "parent":
              user = await prisma.parent.findUnique({
                where: { username: credentials.username }
              })
              break
            default:
              return null
          }

          if (process.env.NODE_ENV !== "production") {
            logger.debug("User lookup result", { found: !!user })
          }

          if (!user) return null

          // Parolni tekshirish
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          if (!isPasswordValid) return null

          return {
            id: user.id,
            username: user.username,
            role: credentials.role,
            name: (user as any)?.name ?? user.username
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            logger.error("Auth error", { error: error instanceof Error ? error.message : String(error) })
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  secret: envServer.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role
        token.username = user.username
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.username = token.username
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Redirect callback", { url, baseUrl })
      }
      // Agar URL relative bo'lsa, baseUrl bilan birlashtirish
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Agar URL baseUrl bilan boshlansa, o'sha URLni qaytarish
      else if (new URL(url).origin === baseUrl) return url
      // Boshqa hollarda baseUrlni qaytarish
      return baseUrl
    }
  }
}

export default NextAuth(authOptions)