import { AddressData } from "@/types/memo";

interface Props {
  value: AddressData;
  onChange: (next: AddressData) => void;
}

export const AddressBlock = ({ value, onChange }: Props) => {
  const set = (k: keyof AddressData, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="address-block">
      <input
        type="text"
        placeholder="Street Address"
        value={value.street1}
        onChange={(e) => set("street1", e.target.value)}
      />
      <input
        type="text"
        placeholder="Address Line 2 (Suite, Unit, etc.)"
        value={value.street2}
        onChange={(e) => set("street2", e.target.value)}
      />
      <div className="address-row">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
        />
        <input
          type="text"
          placeholder="State"
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
        />
        <input
          type="text"
          placeholder="ZIP"
          value={value.zip}
          onChange={(e) => set("zip", e.target.value)}
        />
      </div>
    </div>
  );
};
