// Local compatibility shim for Next.js generated types that import "next/types.js".
// This ensures TypeScript can resolve the module during `.next/types` validation.
declare module "next/types.js" {
  export type { NextApiHandler } from "next";
  export type { ResolvingMetadata, ResolvingViewport } from "next";
}
