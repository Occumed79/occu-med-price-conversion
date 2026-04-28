import { useEffect, useMemo, useState } from "react";
import { AuroraHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { PriceTable } from "./PriceTable";
import { ComponentSidebar } from "./ComponentSidebar";
import { downloadPdf, generateNetworkPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import { Settings, Paperclip } from "lucide-react";
import type { NetworkMemoData } from "@/types/memo";

interface EmailSettings {
  publicKey: string;
  serviceId: string;
  templateId: string;
}

const EMAIL_SETTINGS_KEY = "networkMemo.emailSettings";

const initial: NetworkMemoData = {
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
  existingOrNew: "",
  pricingType: "",
  acquisitionType: "",
  clinicType: "",
  client: "",
  priceRows: [],
};

const CLINIC_TYPES_GROUPED: { label: string; options: string[] }[] = [
  { label: "Medical / Dental Providers", options: ["State Side Dental Provider", "State Side Medical Provider", "Occu-VAX State Side", "International Medical Provider", "International Dental Provider", "Occu-Vax International"] },
  { label: "Specialist Evaluations", options: ["Neurologist", "Orthopaedist", "Psychiatrist", "Optometrist or Ophthalmologist", "Gastroenterology Fitness-for-Duty Evaluation"] },
  { label: "Physical / Fitness Exams", options: ["FAA Physical", "DOT Exam and Certificate", "RTW Physical", "Physical Ability Test", "Psychological Assessment", "Breast Examination", "Sigmoidoscopy"] },
  { label: "Cardiac / Pulmonary", options: ["Treadmill Stress Test", "EKG", "Stress ECHO or SPECT Scan", "Pulmonary Function Test"] },
  { label: "Respirator Testing", options: ["Respirator Fit Test", "OSHA Respirator Medical Evaluation", "N95 Respirator Certification / Fit Test", "Quantitative Respirator Fit Test"] },
  { label: "Imaging", options: ["Chest X-ray", "Mammogram w/ Interpretation", "Gallbladder Ultrasound"] },
  { label: "Labs / Collections", options: ["Blood Collection", "Urine Drug Screen Collection", "After Hours Drug Screen", "DNA Collection", "PPD", "Breath Alcohol Test (BAT)"] },
  { label: "Vision", options: ["Vision", "Farnsworth D-15"] },
  { label: "Other", options: ["Collection Site"] },
];

const loadEmailSettings = (): EmailSettings => {
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (!raw) return { publicKey: "", serviceId: "", templateId: "" };
    const parsed = JSON.parse(raw) as Partial<EmailSettings>;
    return {
      publicKey: parsed.publicKey || "",
      serviceId: parsed.serviceId || "",
      templateId: parsed.templateId || "",
    };
  } catch {
    return { publicKey: "", serviceId: "", templateId: "" };
  }
};

export const NetworkMemoForm = () => {
  const [data, setData] = useState<NetworkMemoData>(initial);
  const [busy, setBusy] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(() => loadEmailSettings());
  const { toast } = useToast();

  const set = <K extends keyof NetworkMemoData>(k: K, v: NetworkMemoData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const addComponent = (name: string) =>
    set("priceRows", [...data.priceRows, { id: `row-${Date.now()}-${Math.random()}`, component: name, price: "" }]);

  const emailConfigured = useMemo(
    () => Boolean(emailSettings.publicKey && emailSettings.serviceId && emailSettings.templateId),
    [emailSettings],
  );

  useEffect(() => {
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(emailSettings));
  }, [emailSettings]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const bytes = await generateNetworkPdf(data);
      downloadPdf(bytes, `network-memo-${data.dateOfMemo || Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: "Network management memo saved." });
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
    const subject = encodeURIComponent(`Network Management Pricing Memo${data.dateOfMemo ? ` - ${data.dateOfMemo}` : ""}`);
    const body = encodeURIComponent(
      `Please see attached Network Management Pricing Memo.\n\nAnalyst: ${data.analystName || "N/A"}\nDate: ${data.dateOfMemo || "N/A"}`,
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

    toast({
      title: emailConfigured ? "Send flow prepared" : "Memo ready",
      description: emailConfigured
        ? "Email settings are saved. PDF downloaded and your mail client opened."
        : "PDF downloaded and your mail client opened for sending.",
    });
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files) return;
    setUploadedFiles(Array.from(files));
  };

  return (
    <>
      <button type="button" className="gear-btn print-hide" onClick={() => setShowSettings(true)} title="Email Settings">
        <Settings size={18} />
      </button>

      <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start">
        <ComponentSidebar onAdd={(c) => addComponent(c.name)} />
      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <AuroraHeader title="Network Management Pricing Memo" />
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
            <Field label="Existing or New Clinic" required>
              <Select value={data.existingOrNew} onChange={(e) => set("existingOrNew", e.target.value)}>
                <option value="" disabled></option>
                <option>Existing Clinic</option>
                <option>New Clinic</option>
              </Select>
            </Field>
            <Field label="Updated Pricing or New Pricing" required>
              <Select value={data.pricingType} onChange={(e) => set("pricingType", e.target.value)}>
                <option value="" disabled></option>
                <option>Updated Pricing</option>
                <option>New Pricing</option>
              </Select>
            </Field>
          </Row>

          <Field label="Acquisition Type" required>
            <Select value={data.acquisitionType} onChange={(e) => set("acquisitionType", e.target.value)}>
              <option value="" disabled></option>
              <option>New Clinic</option>
              <option>Existing Clinic Replacement</option>
              <option>Pricing Agreement Update</option>
              <option>Special Request</option>
              <option>Proactive Effort</option>
            </Select>
          </Field>

          <Field label="Notes or Context Regarding the Pricing Received" required>
            <Textarea placeholder="Relevant context, special conditions, background…" value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <hr className="section-divider" />

          <Field label="Pricing">
            <PriceTable rows={data.priceRows} onChange={(rows) => set("priceRows", rows)} />
          </Field>
          <div className="text-[11px] text-muted-foreground mt-2 mb-4">Prices listed are inclusive of all fees and service charges.</div>

          <Field label="Clinic Address" required>
            <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
          </Field>

          <Row>
            <Field label="Clinic Type">
              <Select value={data.clinicType} onChange={(e) => set("clinicType", e.target.value)}>
                <option value="" disabled>Select type…</option>
                {CLINIC_TYPES_GROUPED.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => <option key={o}>{o}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Client">
              <TextInput placeholder="Associated client name" value={data.client} onChange={(e) => set("client", e.target.value)} />
            </Field>
          </Row>

          <Field label="File Upload">
            <div className="field-label-hint">(Attachments become pages 2+ of the PDF packet)</div>
            <label className="file-upload-area" aria-label="File Upload">
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFilesPicked(e.target.files)} />
              <div className="upload-icon"><Paperclip size={28} /></div>
              <div className="upload-text"><strong>Choose Files</strong> or drag &amp; drop — PDF, JPG, PNG</div>
              <div className="file-name-display">{uploadedFiles.length ? uploadedFiles.map((f) => f.name).join(", ") : ""}</div>
            </label>
          </Field>

          <hr className="section-divider" />

          <Field label="Send To (Recipient Email)">
            <TextInput
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </Field>
        </div>

        <div className="action-bar print-hide">
          <div className="action-left">
            <button type="button" className="btn btn-ghost" onClick={() => setShowSettings(true)}>
              <Settings size={15} />
              Email Settings
            </button>
            <span className={`emailjs-status ${emailConfigured ? "configured" : "not-configured"}`}>
              {emailConfigured ? "Configured" : "Not configured"}
            </span>
            <span className="text-[11px] text-muted-foreground">Saved in this browser so you do not re-enter each time.</span>
          </div>
          <div className="action-right">
            <button type="button" onClick={handleDownload} disabled={busy} className="btn btn-secondary">
              {busy ? "Generating…" : "Download PDF"}
            </button>
            <button type="button" onClick={handleSend} disabled={busy} className="btn btn-primary">
              {busy ? "Generating…" : "Send Memo"}
            </button>
          </div>
        </div>
      </div>
      </div>

      <div className={`modal-overlay ${showSettings ? "open" : ""}`} onClick={() => setShowSettings(false)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>Email Settings · EmailJS</h3>
            <button type="button" className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
          </div>
          <div className="modal-body">
            <p className="modal-desc">
              Configure your EmailJS keys to keep your preferred delivery settings in this browser.
            </p>
            <div className="modal-field">
              <label>Public Key</label>
              <input
                placeholder="e.g. user_xxxxxxxxxxxxxx"
                value={emailSettings.publicKey}
                onChange={(e) => setEmailSettings((s) => ({ ...s, publicKey: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <label>Service ID</label>
              <input
                placeholder="e.g. service_xxxxxxx"
                value={emailSettings.serviceId}
                onChange={(e) => setEmailSettings((s) => ({ ...s, serviceId: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <label>Template ID</label>
              <input
                placeholder="e.g. template_xxxxxxx"
                value={emailSettings.templateId}
                onChange={(e) => setEmailSettings((s) => ({ ...s, templateId: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
