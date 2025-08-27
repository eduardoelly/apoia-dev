import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    User: User & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    username?: string;
    bio?: string;
    connectedStripeAccountId?: string;
  }
}
