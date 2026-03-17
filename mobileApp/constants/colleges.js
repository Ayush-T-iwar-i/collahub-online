// constants/colleges.js
// ── Import everywhere ─────────────────────────────────────
// import { COLLEGE_DEPARTMENTS, COLLEGES, SEMESTERS } from "../../constants/colleges";

export const COLLEGE_DEPARTMENTS = {
  "NIMS Institute of Engineering and Technology": [
    "Computer Science Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics and Communication Engineering (ECE)",
    "Electrical Engineering (EE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering",
    "Chemical Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science Engineering",
  ],
  "NIMS School of Computer Science & AI": [
    "BCA","MCA","B.Sc Computer Science",
    "Artificial Intelligence","Data Science","Cyber Security",
  ],
  "NIMS College of Management Studies": [
    "BBA","MBA","Finance","Marketing","Human Resource","International Business",
  ],
  "NIMS School of Commerce": [
    "B.Com","M.Com","Accounting","Business Economics",
  ],
  "NIMS College of Law": [
    "LLB","BA LLB","BBA LLB","LLM",
  ],
  "NIMS Medical College": [
    "MBBS","MD","MS","Medical Research",
  ],
  "NIMS College of Dental": [
    "BDS","MDS","Orthodontics","Oral Surgery",
  ],
  "NIMS College of Nursing": [
    "B.Sc Nursing","GNM","Post Basic Nursing","M.Sc Nursing",
  ],
  "NIMS College of Pharmacy": [
    "D.Pharm","B.Pharm","M.Pharm","Pharm.D",
  ],
  "NIMS Institute of Allied Health Sciences": [
    "Radiology","Medical Lab Technology","Dialysis Technology","Operation Theatre Technology",
  ],
  "NIMS Institute of Physiotherapy": ["BPT","MPT"],
  "NIMS Institute of Hotel Management": [
    "Hotel Management","Hospitality Management","Tourism Management",
  ],
  "NIMS Institute of Design & Fashion Technology": [
    "Fashion Design","Interior Design","Textile Design",
  ],
  "NIMS School of Architecture": ["B.Arch","M.Arch"],
  "NIMS School of Humanities": [
    "Psychology","English","Sociology","Political Science",
  ],
  "NIMS School of Basic & Applied Sciences": [
    "Physics","Chemistry","Mathematics","Biotechnology",
  ],
  "NIMS School of Journalism & Mass Communication": [
    "Journalism","Mass Communication","Digital Media",
  ],
  "NIMS School of Agriculture": ["B.Sc Agriculture","M.Sc Agriculture"],
  "NIMS Veterinary College": ["BVSc & AH","MVSc"],
  "NIMS School of Aviation": ["Aviation Management","Pilot Training"],
};

export const COLLEGES  = Object.keys(COLLEGE_DEPARTMENTS);
export const SEMESTERS = ["1","2","3","4","5","6","7","8"];