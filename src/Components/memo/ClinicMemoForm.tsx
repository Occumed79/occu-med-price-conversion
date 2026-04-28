import { useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { PriceTable } from "./PriceTable";
import { ComponentSidebar } from "./ComponentSidebar";
import { FACILITY_TYPES, PROVIDER_SPECIALTIES } from "@/data/examComponents";
import { downloadPdf, generateClinicPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import type { ClinicMemoData, PriceRow } from "@/types/memo";

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

export const ClinicMemoForm = () => {
  const [data, setData] = useState<ClinicMemoData>(initial);
  const [busy, setBusy] = useState(false);
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
      const bytes = await generateClinicPdf(data);
      downloadPdf(bytes, `clinic-memo-${data.dateOfMemo || Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: "Clinic pricing memo saved." });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start">
      <ComponentSidebar onAdd={(c) => addComponent(c.name)} />

      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <NavyHeader title="Network Management Provider Pricing Sheet" />
        <div className="form-body">
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

          <hr className="section-divider" />

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

          <Field label="Provider Address" required>
            <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
          </Field>

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

          <hr className="section-divider" />

          <Field label="Pricing">
            <PriceTable rows={data.priceRows} onChange={(rows) => set("priceRows", rows)} />
          </Field>
          <div className="text-[11px] text-muted-foreground mt-2 mb-2">
            Prices listed are inclusive of all fees and service charges.
          </div>

          <Field label="Additional Notes or Context Regarding Pricing">
            <Textarea
              placeholder="Relevant context, special conditions, background…"
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-9 py-5 border-t border-border print-hide">
          <button type="button" onClick={handleDownload} disabled={busy} className="btn-base btn-navy disabled:opacity-60">
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};
