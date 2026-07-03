import { requireUser } from "@/lib/auth";
import { BrandingForm } from "@/components/admin/branding-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Huisstijl</h1>
        <p className="text-sm text-slate-500">
          Logo en kleuren voor de weergave op het scherm.
        </p>
      </div>

      {user.role !== "admin" && (
        <Alert>
          <AlertDescription>
            Alleen admins kunnen de huisstijl aanpassen. Je kunt de instellingen
            wel bekijken.
          </AlertDescription>
        </Alert>
      )}

      <BrandingForm organization={user.organization} />
    </div>
  );
}
