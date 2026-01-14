"use client";

import { signIn, getSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import type { BaseRole } from "@/lib/rbac";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<BaseRole>("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If the user is already logged in
    getSession().then((session: Session | null) => {
      if (session?.user?.role) {
        const r = session.user.role as BaseRole;
        router.push(r === "accountant" ? "/finance/fees" : `/${r}`);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else if (result?.ok) {
        const redirectPath = role === "accountant" ? "/finance/fees" : `/${role}`;
        router.push(redirectPath);
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-4 min-w-[400px]"
      >
        <div className="flex items-center gap-2 mb-4">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <h1 className="text-xl font-bold">EmmanuelActs</h1>
        </div>
        <h2 className="text-gray-400 mb-4">Sign in to your account</h2>
        
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as BaseRole)}
            className="p-2 rounded-md ring-1 ring-gray-300"
            required
          >
            <option value="admin">Administrator</option>
            <option value="accountant">Accountant</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-2 rounded-md ring-1 ring-gray-300"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded-md ring-1 ring-gray-300"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white rounded-md text-sm p-3 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Test accounts:</strong></p>
          <p>Admin: admin1 / admin123</p>
          <p>Accountant: accountant1 / accountant123</p>
          <p>Teacher: teacher1 / teacher123</p>
          <p>Student: student1 / student123</p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
