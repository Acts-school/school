"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const handleLogout = () => {
    signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  return (
    <button 
      onClick={handleLogout}
      className="text-xs bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
    >
      Logout
    </button>
  );
}