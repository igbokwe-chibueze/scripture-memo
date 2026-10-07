import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { deliverPasswordReset } from "@/features/auth/lib/password-reset-delivery";
import { deliverVerificationEmail } from "@/features/auth/lib/email-verification-delivery";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { getDevelopmentOrigins } from "@/lib/auth/development-origins";

const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 60 * 60;

export const auth = betterAuth({
    // WHY: Physical-device testing originates from the computer's LAN address,
    // not localhost. Better Auth must trust that exact development origin while
    // production remains restricted to its configured base URL.
    trustedOrigins:
        process.env.NODE_ENV === "development"
            ? getDevelopmentOrigins()
            : [],
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
        // WHY: A real mailbox is required before an account can start a game.
        // Better Auth also returns a generic sign-up result for duplicate email
        // addresses when verification is required, reducing account discovery.
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        // WHY: Better Auth remains the sole owner of token creation, expiry,
        // validation, password hashing, and session revocation. The delivery
        // adapter receives only Better Auth's ready-to-use reset URL.
        sendResetPassword: async ({ user, url }) => {
            await deliverPasswordReset(user.email, url);
        },
    },
    emailVerification: {
        // WHY: New sign-ups receive a Better Auth-owned token and sign-in with
        // valid credentials resends the link. The UI can report pending status
        // without granting a session before the mailbox is verified.
        sendOnSignUp: true,
        sendOnSignIn: true,
        expiresIn: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
        autoSignInAfterVerification: false,
        sendVerificationEmail: async ({ user, url, token }) => {
            // WHY: Better Auth's signed JWTs do not revoke earlier links when a
            // new one is issued. Store only the keyed digest in the existing
            // Verification table so the newest link becomes the sole active one.
            await authRepository.replaceLatestEmailVerificationToken(
                user.email,
                token,
                new Date(
                    Date.now() + EMAIL_VERIFICATION_EXPIRES_IN_SECONDS * 1000,
                ),
            );
            deliverVerificationEmail({
                recipientEmail: user.email,
                verificationUrl: url,
            });
        },
        beforeEmailVerification: async (user, request) => {
            const token = request
                ? new URL(request.url).searchParams.get("token")
                : null;
            const consumed = token
                ? await authRepository.consumeLatestEmailVerificationToken(
                      user.email,
                      token,
                      new Date(),
                  )
                : false;

            if (!consumed) {
                throw APIError.from("UNAUTHORIZED", {
                    code: "INVALID_TOKEN",
                    message:
                        "This verification link is expired, used, or replaced.",
                });
            }
        },
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
            "/request-password-reset": { window: 15 * 60, max: 5 },
            "/reset-password": { window: 15 * 60, max: 10 },
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
