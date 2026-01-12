import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import SettingsForm, {
  type SettingsFormInput,
} from "@/components/forms/SettingsForm";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="bg-white p-4 rounded-md shadow-sm max-w-md">
          <p className="text-sm text-gray-500">No user session found.</p>
        </div>
      </div>
    );
  }

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });

  const now = new Date();
  const fallbackYear = now.getFullYear();

  const initialData: SettingsFormInput = settings
    ? {
        schoolName: settings.schoolName,
        currentAcademicYear: settings.currentAcademicYear,
        currentTerm: settings.currentTerm,
        passingScore: settings.passingScore ?? undefined,
      }
    : {
        schoolName: "My School",
        currentAcademicYear: fallbackYear,
        currentTerm: "TERM1",
        passingScore: undefined,
      };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="bg-white p-4 rounded-md shadow-sm max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Account Security</h2>
        <p className="text-sm text-gray-500 mb-4">
          Change your password to help keep your account secure.
        </p>
        <ChangePasswordForm />
      </div>
      {role === "admin" && (
        <div className="bg-white p-4 rounded-md shadow-sm max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">
            Configure global school settings. These options affect how the system behaves for
            all users.
          </p>
          <SettingsForm initialData={initialData} />
        </div>
      )}
    </div>
  );
}
