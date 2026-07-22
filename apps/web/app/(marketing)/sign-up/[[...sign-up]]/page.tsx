import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-soil">
          Sign up
        </h1>
        <p className="mt-3 text-mud">
          Add Clerk keys to <code>.env.local</code> to enable authentication.
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-6 py-16">
      <SignUp />
    </div>
  );
}
