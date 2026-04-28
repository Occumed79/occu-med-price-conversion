// Exam component categories used in the Clinic form sidebar.
// Click a component to add a row to the price table.

export interface ExamComponent {
  id: string;
  name: string;
}

export interface ExamCategory {
  category: string;
  items: ExamComponent[];
}

let _id = 0;
const c = (name: string): ExamComponent => ({ id: `cmp-${++_id}`, name });

export const EXAM_CATEGORIES: ExamCategory[] = [
  {
    category: "General Physical Exams",
    items: [
      c("General Physical Exam — Deployment Guidelines (Vital Signs · Sight Screening · Range of Motion)"),
      c("General Physical Exam — Occu-Med Guidelines (Vital Signs · Sight · Whisper Hearing · Dipstick UA · ROM)"),
      c("DOT Exam and Certificate"),
      c("Class I FAA Flight Physical & Certificate"),
      c("Class II FAA Flight Physical & Certificate"),
      c("Class III FAA Flight Physical & Certificate"),
      c("Physical Agility Test"),
      c("Office Visit"),
      c("Consultation"),
      c("Specialty Evaluation"),
      c("Mental Health Evaluation"),
      c("OEUK Medical Review and Certificate"),
    ],
  },
  {
    category: "Vision",
    items: [
      c("Far Vision Corrected"),
      c("Far Vision Uncorrected"),
      c("Far Vision"),
      c("Near Vision Corrected"),
      c("Near Vision Uncorrected"),
      c("Near Vision"),
      c("HRR (Hardy-Rand-Rittler)"),
      c("CAD (Color Assessment & Diagnosis)"),
      c("Cone Contrast Test [Red (L-cone), Green (M-cone), Blue (S-cone)]"),
      c("Titmus Vision"),
      c("Farnsworth D-15"),
      c("Richmond Plates Test"),
      c("Waggoner (W-CCVT)"),
      c("Pseudoisochromatic Plate (PIP) Test"),
      c("Ishihara Color Test"),
    ],
  },
  {
    category: "Hearing",
    items: [
      c("Audiogram with Headset (500–6000 Hz)"),
      c("Audiogram in OSHA-Approved Sound Booth (500–6000 Hz)"),
    ],
  },
  {
    category: "Respirator / Pulmonary",
    items: [
      c("OSHA Respirator Fit Test — Qualitative"),
      c("OSHA Respirator Fit Test — Quantitative"),
      c("Pulmonary Function Test with Interpretation"),
    ],
  },
  {
    category: "Cardiac",
    items: [
      c("Resting EKG (12-Lead) with Interpretation"),
      c("Treadmill Stress Test with Interpretation"),
      c("Echocardiogram"),
    ],
  },
  {
    category: "Imaging",
    items: [
      c("Chest X-Ray (PA) with Radiological Interpretation"),
      c("Chest X-Ray (PA & LAT) with Radiological Interpretation"),
      c("Chest X-Ray (PA) with Radiological B-Read & Interpretation"),
      c("Screening Mammogram with Interpretation"),
      c("Gallbladder Ultrasound"),
      c("Panoramic Film"),
      c("Four (4) Bitewing Radiographs"),
      c("Full Mouth X-ray"),
    ],
  },
  {
    category: "Dental",
    items: [
      c("Dental Evaluation"),
      c("Comprehensive Oral Evaluation (D0150)"),
      c("Comprehensive Periodontal Evaluation (D0180)"),
      c("Panoramic Radiographic Image (D0330)"),
      c("Four Bitewing Radiographs (D0274)"),
      c("Intraoral Comprehensive Series of Radiographic Images (D0210)"),
    ],
  },
  {
    category: "TB Testing",
    items: [
      c("PPD (TB) Skin Test (Placement and Reading)"),
      c("Tuberculosis (TB): QuantiFERON"),
      c("Tuberculosis (TB): T-SPOT.TB"),
    ],
  },
  {
    category: "Specimen Collection",
    items: [
      c("Venipuncture Collection Only (send-out to Occu-Med-designated lab)"),
      c("Urine Drug Screen Collection Only (send-out to Occu-Med-designated lab)"),
      c("Oral/Saliva Drug Screen Collection Only (send-out to Occu-Med-designated lab)"),
      c("Breath Alcohol Test (E.B.T. / B.A.T)"),
      c("Urine Collection Only"),
    ],
  },
  {
    category: "Laboratory — Chemistry",
    items: [
      c("Occu-Med Custom Blood Chemistry Panel"),
    ],
  },
  {
    category: "Laboratory — Hematology / Blood Type",
    items: [
      c("Complete Blood Count with DIFF/PLT"),
      c("ABO/Rh Blood Count / Factor Type"),
      c("Glucose-6-Phosphate Dehydrogenase (G6PD) Deficiency Screen"),
      c("Sickle Cell Test"),
    ],
  },
  {
    category: "Laboratory — Infectious Disease",
    items: [
      c("HIV-I/HIV-II Antibody Screen"),
      c("Hepatitis A (AB - IgG / IgM)"),
      c("Hepatitis B (cAB)"),
      c("Hepatitis B (sAB)"),
      c("Hepatitis B (sAg)"),
      c("Hepatitis C (AB)"),
      c("Varicella Titer (IgG)"),
      c("MMR Titer"),
      c("Rapid Plasma Reagin (RPR) Syphilis"),
      c("Malaria and Filaria — Blood Parasite Screen"),
      c("COVID-19: Rapid Antigen Test"),
    ],
  },
  {
    category: "Laboratory — Urinalysis & Pregnancy",
    items: [
      c("Urinalysis — Gross / Microscopic"),
      c("Pregnancy Test: hCG-Urine (Qualitative)"),
      c("Pregnancy Test: hCG-Blood (Qualitative)"),
    ],
  },
  {
    category: "Laboratory — Stool",
    items: [
      c("Stool Test: Occult Blood"),
      c("Stool Test: Ova and Parasite (Routine)"),
      c("Stool Test: Salmonella, Shigella, E. Coli"),
      c("Stool Test: Campylobacter"),
    ],
  },
  {
    category: "Laboratory — Heavy Metals",
    items: [
      c("Heavy Metal: Lead, Blood"),
      c("Heavy Metal: Arsenic, Blood"),
      c("Heavy Metal: Mercury, Blood"),
      c("Heavy Metal: Cadmium, Blood"),
      c("Heavy Metal: Chromium, Blood"),
    ],
  },
  {
    category: "Drug & Alcohol Testing",
    items: [
      c("5-Panel Urine Drug Screen (THC, COC, OPI, AMP, PCP w/ validity)"),
      c("Confirmatory: Gas Chromatography-Mass Spectrometry (GC-MS)"),
      c("Confirmatory: Liquid Chromatography-Mass Spectrometry (LC-MS)"),
      c("Alcohol — Urine"),
      c("Alcohol — Blood"),
    ],
  },
  {
    category: "Vaccinations",
    items: [
      c("Anthrax Vaccination"),
      c("Cholera Vaccination"),
      c("Hepatitis A Vaccination"),
      c("Hepatitis A&B (Twinrix) Vaccination"),
      c("Hepatitis B Vaccination"),
      c("Hepatitis B Vaccination — Heplisav-B"),
      c("Influenza-INJ Vaccination (Seasonal)"),
      c("Japanese Encephalitis (JEV) Vaccination"),
      c("Measles Mumps Rubella (MMR) Vaccination"),
      c("Meningococcal Vaccination — Menactra"),
      c("Meningococcal Vaccination — MenQuadfi"),
      c("Meningococcal Vaccination — Menveo"),
      c("Pneumococcal Vaccination — Pneumovax 23"),
      c("Pneumococcal Vaccination — Prevnar 13"),
      c("Pneumococcal Vaccination — Prevnar 20"),
      c("Polio Vaccination — Injectable"),
      c("Polio Vaccination — Oral"),
      c("Rabies Vaccination"),
      c("Tetanus-Diphtheria (TD) Vaccination"),
      c("Tetanus-Diphtheria and Pertussis (TDAP) Vaccination"),
      c("Typhoid-INJ Vaccination"),
      c("Typhoid-ORAL Vaccination"),
      c("Varicella Vaccination"),
      c("Yellow Fever Vaccination"),
    ],
  },
  {
    category: "Forms",
    items: [
      c("Occu-Med Medical History Form"),
      c("Occu-Med Physical Evaluation Form"),
      c("Occu-Med Authorization for Release of Medical Information Form"),
      c("Occu-Med Authorization for Examination Form"),
      c("Department of Defense Form - DD2813"),
      c("Department of Defense Form - DD2215"),
      c("Department of Defense Form - DD2975"),
      c("Department of Defense Form - DD2808"),
      c("Department of Defense Form - DD2807"),
      c("National Science Foundation Form - Polar Physical Exam"),
      c("National Science Foundation Form - Polar Dental Exam"),
    ],
  },
  {
    category: "Fees",
    items: [
      c("No Show Fee"),
      c("Bank Transfer Fee"),
      c("Immunization Administration Fee"),
      c("Consultation Fee"),
      c("Specialist Consultation Fee"),
      c("Interpretation Fee"),
      c("Collection Fee"),
    ],
  },
];

export const PROVIDER_SPECIALTIES = [
  "Dental Examiner",
  "Medical Examiner",
  "DOT Examiner",
  "FAA Examiner",
  "Pharmacist",
  "Independent Medical Examiner",
  "Neurologist",
  "Orthopedist",
  "Cardiologist",
  "Psychiatrist",
  "Optometrist",
  "Ophthalmologist",
  "Gastroenterology",
  "Pulmonologist",
  "Fitness-for-Duty Evaluator",
  "Audiologist",
  "ENT",
  "Occupational Health Examiner",
  "Radiologist",
  "Physicians Assistant",
  "Nurse Practitioner",
  "Allied Health Professional",
];

export const FACILITY_TYPES = [
  "Laboratory",
  "Pharmacy",
  "Medical Practice",
  "Dental Practice",
  "Specialty Practice",
  "Hospital",
  "Urgent Care",
  "Radiology Center",
  "Specimen Collection Site",
  "Multi Specialty Clinic",
  "Polyclinic",
];
