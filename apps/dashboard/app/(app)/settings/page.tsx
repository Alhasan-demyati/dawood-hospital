import { getFacility, listAdminUsers, listSpecialties } from "@/lib/queries";
import { PageHeader } from "@/components/editorial/PageHeader";
import { SettingsView } from "./_components/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [admins, facility, specialties] = await Promise.all([
    listAdminUsers(),
    getFacility(),
    listSpecialties(),
  ]);

  return (
    <div>
      <PageHeader titleKey="settings_page_title" />
      <SettingsView admins={admins} facility={facility} specialties={specialties} />
    </div>
  );
}
