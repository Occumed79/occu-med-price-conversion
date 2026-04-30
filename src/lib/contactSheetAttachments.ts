export type AttachmentPage = { title: string; fields: Array<{ label: string; value: string }> };

export const occuMedContactSheetAttachment = (): AttachmentPage => ({
  title: "Occu-Med Contact Sheet",
  fields: [
    { label: "Organization", value: "Occu-Med" },
    { label: "Primary Contact Name", value: "" },
    { label: "Title", value: "" },
    { label: "Email", value: "" },
    { label: "Phone", value: "" },
    { label: "Fax", value: "" },
    { label: "Address", value: "" },
    { label: "Billing Email", value: "" },
  ],
});

export const providerContactSheetAttachment = (): AttachmentPage => ({
  title: "Provider Contact Sheet",
  fields: [
    { label: "Clinic Name", value: "" },
    { label: "Address", value: "" },
    { label: "City, State Zip", value: "" },
    { label: "Telephone", value: "" },
    { label: "Fax", value: "" },
    { label: "Schedule - Name/Title", value: "" },
    { label: "Schedule - Preferred Method", value: "" },
    { label: "Schedule - Phone", value: "" },
    { label: "Schedule - Email", value: "" },
  ],
});
