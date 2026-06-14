/* <!-- REVIEW WITH LEGAL --> placeholder privacy notice. The full policy copy
   (Jordan MoH + Dawood Hospital legal) is produced in step 09; this stub exists
   only so the consent banner's "Learn more" link does not 404 in the POC. */
import Link from "next/link";
import { dict } from "@dawood/shared";

export const metadata = {
  title: "سياسة الخصوصية — مستشفى داوود",
};

// Server component placeholder. Arabic default copy (no client language context).
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start gap-4 bg-background px-6 py-16 text-text-primary">
      <h1 className="font-display text-2xl font-semibold">سياسة الخصوصية</h1>
      <p className="leading-relaxed text-text-muted">
        هذه صفحة تمهيدية. سيتم نشر نص سياسة الخصوصية الكامل — المتوافق مع إرشادات
        وزارة الصحة الأردنية وسياسات مستشفى داوود — قبل الإطلاق.
      </p>
      <Link href="/" className="font-medium text-accent underline">
        {dict.ar.callPage_title}
      </Link>
    </main>
  );
}
