/**
 * Synthetic, purely fictional sample datasets for demonstration and testing.
 * Contains zero real individuals' data.
 */
export const SYNTHETIC_SAMPLE_TEXT = `# FICTIONAL SYNTHETIC SAMPLE — FOR TESTING ONLY
Incident Ticket: INC-2026-0419 (Generated 2026-11-27, Order Ref: ORD-88412009)
Summary: Customer Aarav (synthetic) reported billing sync timeout.

Primary Contact:
- Email: aarav.test@example.com
- Backup Email (mixed case): AARAV.TEST@EXAMPLE.COM
- Secondary Email: billing.ops@sub.example.org
- Indian Mobile: +91 98765 43210
- Domestic Format (same number): 09876543210
- International Support Line: +1 (555) 234-5678

KYC & Financial Identifiers (Synthetic):
- PAN Card: ABCDE1234F (lowercase check: abcde1234f)
- Aadhaar (spaced): 1234 5678 9012
- Aadhaar (hyphenated, repeated): 1234-5678-9012
- Test Card (Luhn-valid synthetic): 4111 1111 1111 1111
- Repeated Card (hyphenated): 4111-1111-1111-1111

Network Telemetry:
- Client IPv4: 192.168.10.42 (retry from 192.168.10.42)
- Edge IPv6: 2001:0db8:85a3::8a2e:0370:7334

False-Positive Rejection Checks (Should remain UNCHANGED):
- Invalid Luhn Card Candidate: 4111 1111 1111 1112
- Invalid IPv4 Octet: 192.168.1.256 and 999.10.20.30
- Ordinary Date & Reference ID: 2026-11-27 | Batch #774219 | Version v2.4.1.0
- Non-PII Word Boundary Check: COMPANY1234Z should not match PAN.
`;

export const SYNTHETIC_SAMPLE_CSV = `ticket_id,customer_email,phone,pan,aadhaar,card_number,client_ip,notes
TKT-101,aarav.test@example.com,+91 98765 43210,ABCDE1234F,1234 5678 9012,4111 1111 1111 1111,192.168.10.42,"Quoted, note with ""escaped"" quotes"
TKT-102,AARAV.TEST@EXAMPLE.COM,09876543210,abcde1234f,1234-5678-9012,4111-1111-1111-1111,2001:0db8:85a3::8a2e:0370:7334,Repeated entity check
TKT-103,billing.ops@sub.example.org,+1 (555) 234-5678,,00123,4111 1111 1111 1112,192.168.1.256,"Invalid Luhn & IP; leading zero ID 00123 preserved"
`;

export type SampleScenarioId =
  | 'support'
  | 'banking'
  | 'healthcare'
  | 'employee'
  | 'ecommerce'
  | 'devlogs'
  | 'aiprompt';

export interface SampleScenario {
  id: SampleScenarioId;
  label: string;
  description: string;
  content: string;
}

export const SYNTHETIC_SAMPLE_LIBRARY: readonly SampleScenario[] = [
  {
    id: 'support',
    label: 'Customer Support',
    description: 'Billing ticket with all 6 PII classes and false-positive checks',
    content: SYNTHETIC_SAMPLE_TEXT,
  },
  {
    id: 'banking',
    label: 'Banking & KYC',
    description: 'Synthetic dispute case with PAN, Aadhaar, cards, and invalid Luhn check',
    content: `# SYNTHETIC BANKING KYC CASE — TEST ONLY
Dispute Case: BNK-2026-8821
Account Holder Email: kyc.desk@fictional-bank.example
Callback Mobile: +91 98201 55432
PAN Verification Ref: PQRST6789K
Aadhaar Ref: 9876 5432 1098
Synthetic Visa Test Card: 4111-1111-1111-1111
Rejected Card Candidate: 4111-1111-1111-1112
Terminal IP: 10.42.18.90
`,
  },
  {
    id: 'healthcare',
    label: 'Healthcare Triage',
    description: 'Synthetic clinic intake note with contact and Aadhaar identifiers',
    content: `# SYNTHETIC CLINICAL TRIAGE NOTE — TEST ONLY
Intake Ref: CLN-2026-104
Patient Contact Email: patient.demo@clinic-test.example
Guardian Phone: +91 91234 56789
Aadhaar Insurance Link: 4567 8912 3456
Telehealth Node IPv6: fe80::1a2b:3c4d:5e6f:7890
Notes: Patient reports seasonal allergy; no medication changes required.
`,
  },
  {
    id: 'employee',
    label: 'Employee Directory',
    description: 'Synthetic HR onboarding snippet with PAN, Aadhaar, and corporate contacts',
    content: `# SYNTHETIC HR ONBOARDING RECORD — TEST ONLY
Employee Email: rohan.synth@corp-demo.example
Personal Mobile: 9876543210
Tax PAN: LMNOQ4321Z
Aadhaar On File: 3456-7890-1234
Corporate Expense Card: 3782 822463 10005
Workstation IP: 172.16.40.12
`,
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce Order',
    description: 'Synthetic checkout trace with payment card, phone, and IPv4/IPv6',
    content: `# SYNTHETIC CHECKOUT AUDIT — TEST ONLY
Order ID: ORD-2026-99310
Buyer Email: shopper.mock@store-test.example
Delivery SMS: +1 (415) 555-0199
Test Card (Luhn valid): 4000000000006
Checkout IPv4: 203.0.113.45
Edge IPv6: 2001:db8::8a2e:370:7334
`,
  },
  {
    id: 'devlogs',
    label: 'Developer Logs',
    description: 'Synthetic API gateway error log with leaked client headers and PII',
    content: `[2026-11-27T08:14:22Z] WARN auth-gateway: retry from 198.51.100.24 (v6 ::ffff:198.51.100.24)
[2026-11-27T08:14:23Z] INFO user-lookup email=dev.ops@service-mock.example phone=+91-98111-22334
[2026-11-27T08:14:24Z] ERROR kyc-webhook pan=ABCDE1234F card=4111111111111111 failed=false
[2026-11-27T08:14:25Z] DEBUG ignored-token=COMPANY1234Z bad_ip=256.1.1.1
`,
  },
  {
    id: 'aiprompt',
    label: 'AI Prompt Check',
    description: 'Synthetic prompt draft sanitized before pasting into an external AI assistant',
    content: `Please draft a polite escalation reply for this customer ticket:
Customer: Priya (synthetic) <priya.prompt@example.org>, Phone: +91 98765 43210.
She paid with card 4111 1111 1111 1111 from IP 192.0.2.15 and provided PAN ABCDE1234F and Aadhaar 1234 5678 9012.
Summarize next steps without changing the refund policy.
`,
  },
] as const;
