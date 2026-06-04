import logo from "@/assets/occu-med-logo.png";

interface Props {
  title: string;
}

export const AuroraHeader = ({ title }: Props) => (
  <div className="aurora-header">
    <img src={logo} alt="Occu-Med" className="header-logo" />
    <div className="header-title">{title}</div>
  </div>
);

export const NavyHeader = ({ title }: Props) => (
  <div className="navy-header">
    <div className="navy-orb navy-orb-1" />
    <div className="navy-orb navy-orb-2" />
    <div className="navy-orb navy-orb-3" />
    <div className="navy-orb navy-orb-4" />
    <img src={logo} alt="Occu-Med" className="header-logo" />
    <div className="header-title">{title}</div>
  </div>
);
