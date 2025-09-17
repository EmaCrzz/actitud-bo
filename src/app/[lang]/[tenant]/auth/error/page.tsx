import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/i18n/api";
import type { Language } from "@/lib/i18n/types";
import type { TenantsType } from "@/lib/tenants";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; tenant: string }>;
  searchParams: Promise<{ error: string }>;
}) {
  const { lang, tenant } = await params;
  const searchParamsResolved = await searchParams;
  const { t } = await api.fetch(lang as Language, tenant as TenantsType);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 pt-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {t('auth.error.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchParamsResolved?.error ? (
                <p className="text-sm text-muted-foreground">
                  {t('auth.error.codeError', { error: searchParamsResolved.error })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('auth.error.unspecifiedError')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
