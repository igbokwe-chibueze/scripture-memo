import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";


export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            // WHY: Proxy and protected server code need the database-backed role
            // on the trusted session user. It is never accepted from sign-up or
            // profile input, preventing self-assigned administrator privileges.
            role: {
                type: "string",
                required: false,
                input: false,
                defaultValue: "USER",
            },
        },
    },
    rateLimit: {
        enabled: true,
        storage: "database",
        window: 60,
        max: 100,
        customRules: {
            "/sign-in/email": { window: 15 * 60, max: 10 },
            "/sign-up/email": { window: 60 * 60, max: 5 },
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60, // 1 minute
        }
    },
    plugins: [
        nextCookies(),
    ],
});
