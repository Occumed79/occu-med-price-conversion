import { useState } from "react";
import { ClinicMemoForm } from "@/components/memo/ClinicMemoForm";
import { FloatingFormSelector, type FormVariant } from "@/components/memo/FloatingFormSelector";
import { NetworkMemoForm } from "@/components/memo/NetworkMemoForm";
import { SignedClinicMemoForm } from "@/components/memo/SignedClinicMemoForm";
import { ProviderAgreementForm } from "@/components/memo/ProviderAgreementForm";
import { ContactSheetForm } from "@/components/memo/ContactSheetForm";

const Index = () => {
  const [variant, setVariant] = useState<FormVariant>("network");

  return (
    <main className="min-h-screen py-7 px-4 pb-24">
      <h1 className="sr-only">Occu-Med Pricing Memo</h1>
      {variant === "network" && <NetworkMemoForm />}
      {variant === "clinic" && <ClinicMemoForm />}
      {variant === "clinic-signed" && <SignedClinicMemoForm />}
      {variant === "provider-agreement" && <ProviderAgreementForm includeTermsBlock={false} />}
      {variant === "provider-agreement-terms" && <ProviderAgreementForm includeTermsBlock />}
      {variant === "occu-contact-sheet" && <ContactSheetForm kind="occu" />}
      {variant === "provider-contact-sheet" && <ContactSheetForm kind="provider" />}
      <FloatingFormSelector variant={variant} onSelect={setVariant} />
    </main>
  );
};

export default Index;
