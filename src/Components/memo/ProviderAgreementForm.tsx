import { useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { PriceTable } from "./PriceTable";
import { ComponentSidebar } from "./ComponentSidebar";
import { FACILITY_TYPES, PROVIDER_SPECIALTIES } from "@/data/examComponents";
import { appendAttachmentPages, downloadPdf, generateClinicPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import type { ClinicMemoData, PriceRow } from "@/types/memo";

interface Props {
  includeTermsBlock: boolean;
}

const initial: ClinicMemoData = {
  analystName: "",
  directorName: "",
  dateOfMemo: "",
  dateOfPricingReceived: "",
  billingTerms: "",
  sourceOfPricing: "",
  clinicRepName: "",
  methodOfComm: "",
  notes: "",
  address: { street1: "", street2: "", city: "", state: "", zip: "" },
  newOrExistingProvider: "",
  newOrUpdatedPricing: "",
  providerSpecialty: "",
  facilityType: "",
  priceRows: [],
};

let _id = 0;
const newId = () => `row-${Date.now()}-${++_id}`;

export const ProviderAgreementForm = ({ includeTermsBlock }: Props) => {
  const [data, setData] = useState<ClinicMemoData>(initial);
  const [busy, setBusy] = useState(false);
  const [includeOccuContact, setIncludeOccuContact] = useState(false);
  const [includeProviderContact, setIncludeProviderContact] = useState(false);
  const [occuContact, setOccuContact] = useState({
    organization: "Occu-Med",
    contactName: "",
    title: "",
    email: "",
    phone: "",
    fax: "",
    address: "",
    billingEmail: "",
  });
  const [providerContact, setProviderContact] = useState({
    organization: "",
    contactName: "",
    title: "",
    email: "",
    phone: "",
    fax: "",
    address: "",
    afterHoursPhone: "",
  });
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof ClinicMemoData>(k: K, v: ClinicMemoData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const addComponent = (name: string) => {
    const row: PriceRow = { id: newId(), component: name, price: "" };
    set("priceRows", [...data.priceRows, row]);
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const baseBytes = await generateClinicPdf(data);
      const attachmentPages: { title: string; fields: Array<{ label: string; value: string }> }[] = [];

      if (includeOccuContact) {
        attachmentPages.push({
          title: "Occu-Med Contact Information",
          fields: [
            { label: "Organization", value: occuContact.organization },
            { label: "Primary Contact Name", value: occuContact.contactName },
            { label: "Title", value: occuContact.title },
            { label: "Email", value: occuContact.email },
            { label: "Phone", value: occuContact.phone },
            { label: "Fax", value: occuContact.fax },
            { label: "Address", value: occuContact.address },
            { label: "Billing Email", value: occuContact.billingEmail },
          ],
        });
      }

      if (includeProviderContact) {
        attachmentPages.push({
          title: "Provider Contact Information",
          fields: [
            { label: "Organization", value: providerContact.organization },
            { label: "Primary Contact Name", value: providerContact.contactName },
            { label: "Title", value: providerContact.title },
            { label: "Email", value: providerContact.email },
            { label: "Phone", value: providerContact.phone },
            { label: "After-hours Phone", value: providerContact.afterHoursPhone },
            { label: "Fax", value: providerContact.fax },
            { label: "Address", value: providerContact.address },
          ],
        });
      }

      const finalBytes = await appendAttachmentPages(baseBytes, attachmentPages);
      downloadPdf(finalBytes, `provider-service-agreement-${data.dateOfMemo || Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: "Provider service agreement saved." });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: "Recipient email required", description: "Enter an email address before sending.", variant: "destructive" });
      return;
    }
    await handleDownload();
    const subject = encodeURIComponent(`Provider Service Agreement${data.dateOfMemo ? ` - ${data.dateOfMemo}` : ""}`);
    const body = encodeURIComponent(
      `Please see attached Provider Service Agreement.\n\nAnalyst: ${data.analystName || "N/A"}\nSigned by: ${signatureName || "N/A"}`,
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start">
      <ComponentSidebar onAdd={(c) => addComponent(c.name)} />

      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <NavyHeader title="Provider Service Agreement" />
        <div className="form-body">
            {includeTermsBlock && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 mb-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold">Scheduling Process</h3>
                <p className="text-sm text-muted-foreground">An Occu-Med team member will coordinate with your preferred point of contact to facilitate an appointment. In advance of a patient’s arrival, the Occu-Med team member will forward an Authorization containing the patient’s demographic information, client information, invoicing information, and indicate the requested testing to be conducted and/or immunizations to be administered.</p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Reporting Process</h3>
                <p className="text-sm text-muted-foreground">Once all authorized testing has been conducted and/or immunizations administered, all results and associated paperwork should be reported immediately via email to Occu-Med’s Communications Manager at harvesting@occu-med.com. Note: it is expected that all results will be reported as available.</p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Billing Terms</h3>
                <p className="text-sm text-muted-foreground">After all results have been reported, Occu-Med’s Finance Department will review and process the invoice. Occu-Med will pay all undisputed invoices within NET 30 billing terms. These terms commence upon receipt of an itemized, undisputed invoice. An invoice is determined undisputed when Occu-Med’s Finance Department agrees that it accurately reflects all authorized and performed testing and/or immunizations administered at the rates indicated below. Please submit all invoices to Finance@occu-med.com.</p>
              </div>
            </div>
          )}

          <Row>
            <Field label="Network Management Analyst Name" required>
              <TextInput placeholder="Full name" value={data.analystName} onChange={(e) => set("analystName", e.target.value)} />
            </Field>
            <Field label="Director of Network Management">
              <TextInput placeholder="Full name" value={data.directorName} onChange={(e) => set("directorName", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Pricing Established" required>
              <TextInput type="date" value={data.dateOfMemo} onChange={(e) => set("dateOfMemo", e.target.value)} />
            </Field>
            <Field label="Pricing Expires" required>
              <TextInput type="date" value={data.dateOfPricingReceived} onChange={(e) => set("dateOfPricingReceived", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Source of Pricing" required>
              <TextInput placeholder="e.g. Email, Phone, Portal" value={data.sourceOfPricing} onChange={(e) => set("sourceOfPricing", e.target.value)} />
            </Field>
            <Field label="Clinic Representative Name">
              <TextInput placeholder="Contact name" value={data.clinicRepName} onChange={(e) => set("clinicRepName", e.target.value)} />
            </Field>
          </Row>

          <Field label="Method of Communication" required>
            <TextInput placeholder="e.g. Email, Phone, Fax" value={data.methodOfComm} onChange={(e) => set("methodOfComm", e.target.value)} />
          </Field>

          <Field label="Billing Terms" required>
            <Select value={data.billingTerms} onChange={(e) => set("billingTerms", e.target.value)}>
              <option value="" disabled></option>
              <option>Net 30</option>
              <option>Net 15</option>
              <option>Payment at Time of Service</option>
            </Select>
          </Field>

          <Row>
            <Field label="New or Existing Provider" required>
              <Select value={data.newOrExistingProvider} onChange={(e) => set("newOrExistingProvider", e.target.value)}>
                <option value="" disabled></option>
                <option>New Provider</option>
                <option>Existing Provider</option>
              </Select>
            </Field>
            <Field label="New or Updated Pricing" required>
              <Select value={data.newOrUpdatedPricing} onChange={(e) => set("newOrUpdatedPricing", e.target.value)}>
                <option value="" disabled></option>
                <option>New Pricing</option>
                <option>Updated Pricing</option>
              </Select>
            </Field>
          </Row>

          <Row>
            <Field label="Provider Specialty / Practice">
              <Select value={data.providerSpecialty} onChange={(e) => set("providerSpecialty", e.target.value)}>
                <option value="" disabled>Select specialty…</option>
                {PROVIDER_SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Facility Type">
              <Select value={data.facilityType} onChange={(e) => set("facilityType", e.target.value)}>
                <option value="" disabled>Select facility…</option>
                {FACILITY_TYPES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </Row>

          <Field label="Provider Address" required>
            <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
          </Field>

          <Field label="Pricing">
            <PriceTable rows={data.priceRows} onChange={(rows) => set("priceRows", rows)} />
          </Field>
          <div className="text-[11px] text-muted-foreground mt-2 mb-2">Prices listed are inclusive of all fees and service charges.</div>

          <Field label="Additional Notes or Context Regarding Pricing">
            <Textarea
              placeholder="Relevant context, special conditions, background…"
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <hr className="section-divider" />

          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={includeOccuContact} onChange={(e) => setIncludeOccuContact(e.target.checked)} />
            Include attachment: Occu-Med Contact Information
          </label>
          {includeOccuContact && (
            <Row>
              <Field label="Organization"><TextInput value={occuContact.organization} onChange={(e) => setOccuContact((s) => ({ ...s, organization: e.target.value }))} /></Field>
              <Field label="Primary Contact Name"><TextInput value={occuContact.contactName} onChange={(e) => setOccuContact((s) => ({ ...s, contactName: e.target.value }))} /></Field>
            </Row>
          )}
          {includeOccuContact && (
            <Row>
              <Field label="Title"><TextInput value={occuContact.title} onChange={(e) => setOccuContact((s) => ({ ...s, title: e.target.value }))} /></Field>
              <Field label="Occu-Med Contact Email"><TextInput type="email" value={occuContact.email} onChange={(e) => setOccuContact((s) => ({ ...s, email: e.target.value }))} /></Field>
            </Row>
          )}
          {includeOccuContact && (
            <Row>
              <Field label="Occu-Med Contact Phone"><TextInput value={occuContact.phone} onChange={(e) => setOccuContact((s) => ({ ...s, phone: e.target.value }))} /></Field>
              <Field label="Fax"><TextInput value={occuContact.fax} onChange={(e) => setOccuContact((s) => ({ ...s, fax: e.target.value }))} /></Field>
            </Row>
          )}
          {includeOccuContact && (
            <Row>
              <Field label="Address"><TextInput value={occuContact.address} onChange={(e) => setOccuContact((s) => ({ ...s, address: e.target.value }))} /></Field>
              <Field label="Billing Email"><TextInput type="email" value={occuContact.billingEmail} onChange={(e) => setOccuContact((s) => ({ ...s, billingEmail: e.target.value }))} /></Field>
            </Row>
          )}

          <label className="flex items-center gap-2 text-sm mt-3 mb-2">
            <input type="checkbox" checked={includeProviderContact} onChange={(e) => setIncludeProviderContact(e.target.checked)} />
            Include attachment: Provider Contact Information
          </label>
          {includeProviderContact && (
            <Row>
              <Field label="Organization"><TextInput value={providerContact.organization} onChange={(e) => setProviderContact((s) => ({ ...s, organization: e.target.value }))} /></Field>
              <Field label="Primary Contact Name"><TextInput value={providerContact.contactName} onChange={(e) => setProviderContact((s) => ({ ...s, contactName: e.target.value }))} /></Field>
            </Row>
          )}
          {includeProviderContact && (
            <Row>
              <Field label="Title"><TextInput value={providerContact.title} onChange={(e) => setProviderContact((s) => ({ ...s, title: e.target.value }))} /></Field>
              <Field label="Provider Contact Email"><TextInput type="email" value={providerContact.email} onChange={(e) => setProviderContact((s) => ({ ...s, email: e.target.value }))} /></Field>
            </Row>
          )}
          {includeProviderContact && (
            <Row>
              <Field label="Provider Contact Phone"><TextInput value={providerContact.phone} onChange={(e) => setProviderContact((s) => ({ ...s, phone: e.target.value }))} /></Field>
              <Field label="After-hours Phone"><TextInput value={providerContact.afterHoursPhone} onChange={(e) => setProviderContact((s) => ({ ...s, afterHoursPhone: e.target.value }))} /></Field>
            </Row>
          )}
          {includeProviderContact && (
            <Row>
              <Field label="Fax"><TextInput value={providerContact.fax} onChange={(e) => setProviderContact((s) => ({ ...s, fax: e.target.value }))} /></Field>
              <Field label="Provider Contact Address"><TextInput value={providerContact.address} onChange={(e) => setProviderContact((s) => ({ ...s, address: e.target.value }))} /></Field>
            </Row>
          )}

          <hr className="section-divider" />
          <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-3">Signature</h3>
          <Row>
            <Field label="Signature (typed name)" required>
              <TextInput placeholder="Type your full name to sign" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
            </Field>
            <Field label="Title">
              <TextInput placeholder="e.g., Office Manager" value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Date Signed">
              <TextInput type="date" value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} />
            </Field>
            <Field label="Send To (Recipient Email)">
              <TextInput type="email" placeholder="recipient@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </Field>
          </Row>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-9 py-5 border-t border-border print-hide">
          <button type="button" onClick={handleSend} disabled={busy} className="btn btn-secondary disabled:opacity-60">
            {busy ? "Generating…" : "Send Memo"}
          </button>
          <button type="button" onClick={handleDownload} disabled={busy} className="btn-base btn-navy disabled:opacity-60">
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};
