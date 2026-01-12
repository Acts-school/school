import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-gray-600">The page you are looking for does not exist.</p>
      <Link href="/" className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800">Go home</Link>
    </div>
  );
}
