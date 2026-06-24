/* ── Default agreement template content ──
 *
 * The CONTRACT template here mirrors the Ecom Landers Contractor
 * Agreement (Master Terms + Engagement Schedule) drafted 2026-06-22.
 * Edit any clause freely in /company/contracts/templates without
 * touching code; the rendered document the contractor sees is
 * snapshotted at creation time so template edits don't rewrite
 * already-signed agreements.
 *
 * IMPORTANT: this is the agreed master draft. Have a solicitor sign
 * off before going live with new contractors.
 *
 * Placeholder syntax (Mustache-style): {{ person_full_name }},
 * {{ start_date }}, {{ comp_amount }}, etc. Resolution lives in
 * render.ts and reads from the snapshotted fields on each Agreement
 * row at render time.
 *
 * The `only_for` field on a clause restricts it to one employment
 * type so a single template can cover both employee and contractor
 * variants (clauses without `only_for` apply to both).
 */

import type { TemplateBody } from "./types";

const ECOM_LANDERS_LEGAL_NAME = "Ecom Landers Ltd";
const ECOM_LANDERS_COMPANY_NUMBER = "[NUMBER]"; /* TODO: fill from Companies House */
const ECOM_LANDERS_ADDRESS =
  "2 Strickland Cl, Grappenhall, Warrington WA4 3LJ, UK";

export const DEFAULT_NDA_TEMPLATE: TemplateBody = {
  title: "Mutual Non-Disclosure Agreement",
  intro: `This Non-Disclosure Agreement ("Agreement") is entered into between ${ECOM_LANDERS_LEGAL_NAME} ("Company"), with its registered address at ${ECOM_LANDERS_ADDRESS}, and {{ person_full_name }} ("Recipient"), and is effective from {{ effective_date }}.

The parties wish to share confidential information in connection with Recipient's engagement with Company. This Agreement sets out the terms on which that confidential information may be used and protected.`,
  clauses: [
    {
      id: "nda-1",
      heading: "Definition of confidential information",
      body: `"Confidential Information" means any non-public information disclosed by Company to Recipient, in any form (verbal, written, electronic, visual), that relates to Company's business, clients, products, services, finances, employees, contractors, methods, processes, or strategy, including but not limited to: client lists and engagements; pricing, sales, and revenue figures; internal tooling and codebases; design systems, templates, and creative work in progress; conversion data and test results; operational systems and SOPs; and the existence and content of this Agreement itself.`,
    },
    {
      id: "nda-2",
      heading: "Obligations of recipient",
      body: `Recipient agrees to: (a) hold all Confidential Information in strict confidence; (b) use Confidential Information solely for the purpose of performing services for Company; (c) not disclose any Confidential Information to any third party without Company's prior written consent; (d) take all reasonable precautions to prevent unauthorised disclosure or use; and (e) not copy, reproduce, or store Confidential Information except as strictly required to perform services for Company.`,
    },
    {
      id: "nda-3",
      heading: "Exclusions",
      body: `Confidential Information does not include information that: (a) was lawfully in Recipient's possession before disclosure by Company; (b) is or becomes publicly available through no fault of Recipient; (c) is lawfully received from a third party not under a duty of confidentiality; or (d) is independently developed by Recipient without reference to Confidential Information.`,
    },
    {
      id: "nda-4",
      heading: "Term and return of information",
      body: `This Agreement begins on the effective date above and continues for the duration of Recipient's engagement with Company and for three (3) years thereafter. On termination of engagement or on Company's request, Recipient will promptly return or destroy all copies of Confidential Information in their possession.`,
    },
    {
      id: "nda-5",
      heading: "No grant of rights",
      body: `Nothing in this Agreement grants Recipient any licence, ownership, or rights in or to any Confidential Information, intellectual property, or trade secret of Company, whether by implication, estoppel, or otherwise.`,
    },
    {
      id: "nda-6",
      heading: "Remedies",
      body: `Recipient acknowledges that unauthorised disclosure or use of Confidential Information may cause Company irreparable harm for which damages may be inadequate, and Company is entitled to seek injunctive relief in addition to any other remedies available at law or in equity.`,
    },
    {
      id: "nda-7",
      heading: "Governing law",
      body: `This Agreement is governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales for any dispute arising out of or in connection with this Agreement.`,
    },
  ],
  outro: `By signing below, Recipient acknowledges that they have read, understood, and agree to be bound by the terms of this Agreement.`,
};

/* TBC placeholder body for templates Dylan hasn't authored yet
 * (Designer, Developer at time of writing). Renders an obvious
 * "not ready" notice as the only clause so admin spots it before
 * sending a contract using this template. Replaced with a real
 * body the moment Dylan ships the master doc. */
export const TBC_TEMPLATE_BODY: TemplateBody = {
  title: "Contractor Agreement — TBC",
  intro: `This template hasn't been authored yet.

DO NOT use this for a real engagement. Pick the Leadership template instead, or wait until the master clauses are filled in at /company/contracts/templates.`,
  clauses: [
    {
      id: "tbc-1",
      heading: "Template not yet configured",
      body: `This role-specific contract template is on the to-do list. Until it's authored:

(a) for engagements where Leadership terms are acceptable, use the Leadership / CSM template;
(b) for genuinely role-specific terms, contact Dylan to author the master clauses;
(c) per-contract one-off edits remain available via the Clauses panel on the contract detail page.

Edit at /company/contracts/templates → pick the relevant tab → replace this body with the master clauses for this role.`,
    },
  ],
  outro: "",
};

export const DEFAULT_CONTRACT_TEMPLATE: TemplateBody = {
  title: "Contractor Agreement",
  intro: `Master Terms of Engagement, incorporating Confidentiality / Non-Disclosure.

THIS AGREEMENT is dated {{ agreement_date }}.

PARTIES

(1) ${ECOM_LANDERS_LEGAL_NAME}, a company incorporated in England and Wales (company number ${ECOM_LANDERS_COMPANY_NUMBER}) whose registered office is at ${ECOM_LANDERS_ADDRESS} (the "Company"); and

(2) {{ person_full_name }}, the individual named in the Engagement Schedule below (the "Contractor").

BACKGROUND

(A) The Company operates a conversion-rate-optimisation, design and development agency and engages contractors to provide services to it and its Clients.

(B) The Contractor is in business on the Contractor's own account and has agreed to provide the Services to the Company as an independent contractor, on these master terms together with the Engagement Schedule.

(C) Where the parties later agree to convert the engagement to employment, they will document that separately; until then the Contractor's status is that of an independent contractor only.

IT IS AGREED as follows.`,
  clauses: [
    {
      id: "ct-1",
      heading: "1. Definitions and interpretation",
      only_for: "contractor",
      body: `1.1 In this Agreement: "Client" means any client or customer of the Company; "Engagement Schedule" means the schedule of engagement details and fees signed by the parties; "Confidential Information" has the meaning in Clause 9; "Intellectual Property Rights" means patents, copyright, database rights, design rights, trade marks, know-how and all other intellectual property rights, whether registered or not, anywhere in the world; "Services" means the services described in the Engagement Schedule; and "Work Product" has the meaning in Clause 8.

1.2 If there is any conflict between these master terms and the Engagement Schedule, these master terms prevail unless the Engagement Schedule expressly states otherwise. Headings are for convenience only.`,
    },
    {
      id: "ct-2",
      heading: "2. Engagement, term and conversion",
      only_for: "contractor",
      body: `2.1 The Company engages the Contractor, and the Contractor agrees to provide the Services, on the terms of this Agreement, from the commencement date stated in the Engagement Schedule.

2.2 The engagement runs for the term stated in the Engagement Schedule (for example a fixed term of twelve (12) months, or a rolling engagement), and may be terminated earlier under Clause 13.

2.3 The parties may by written agreement convert the engagement into employment. Nothing in this Agreement obliges either party to do so, creates any expectation of employment, or gives the Contractor any continuity of employment or employment rights during the engagement.`,
    },
    {
      id: "ct-3",
      heading: "3. Status of the contractor",
      only_for: "contractor",
      body: `3.1 The Contractor is an independent contractor in business on the Contractor's own account. Nothing in this Agreement makes the Contractor an employee, worker, agent or partner of the Company, and the Contractor will not hold out as such.

3.2 The Contractor is solely responsible for accounting to the relevant tax authority for all income tax, National Insurance contributions (or local equivalents) and any other liabilities arising on the fees, in every jurisdiction in which the Contractor is liable.

3.3 As an independent contractor, the Contractor is not entitled to receive from the Company any holiday pay, sick pay, pension contributions, statutory maternity, paternity, adoption or shared parental pay, or any other employee or worker benefit. The Contractor may instead be entitled to claim state benefits (such as Maternity Allowance) directly from the relevant government body, which is a matter between the Contractor and that body.

3.4 The Company may, at its sole and absolute discretion (exercised fairly and without unlawful discrimination), make a one-off, ex gratia goodwill contribution to the Contractor in connection with a period of family leave (including maternity, paternity, adoption or shared parental leave) or other significant personal circumstances. Any such contribution: (a) is made entirely at the Company's discretion and is not a contractual entitlement; (b) does not oblige the Company to make any contribution on any other occasion or to any other contractor, and no contribution made on one occasion creates any expectation or precedent of another; (c) does not constitute pay for any employee or worker benefit and does not alter the Contractor's status as an independent contractor; and (d) is paid gross, with the Contractor responsible for any tax or contributions due on it under Clauses 3.2 and 15.

3.5 Where the off-payroll working rules ("IR35") are relevant and the Contractor provides the Services through an intermediary, the Contractor confirms the entity is {{ contractor_company }} and is responsible for determining and operating the correct tax treatment.

3.6 The Contractor is free to provide services to others during the engagement, provided this does not breach Clause 12 and does not interfere with proper performance of the Services.

3.7 Despite Clause 3.6, the Contractor will not, without the Company's prior written consent, provide services to any business that directly competes with the Company where doing so gives rise to a conflict of interest or a risk that the Company's Confidential Information may be misused, and will promptly disclose to the Company any actual or potential conflict of interest.

3.8 The Company is not obliged to offer the Contractor any particular amount of work, and the Contractor is not obliged to accept any work offered. The Services are provided as and when agreed between the parties from time to time, and no pattern of offering or accepting work creates any obligation to continue to offer or accept it.`,
    },
    {
      id: "ct-4",
      heading: "4. The services and standard of performance",
      only_for: "contractor",
      body: `4.1 The Contractor will provide the Services with all reasonable skill, care and diligence and to the standard of a competent professional in the relevant field, and will use reasonable endeavours to meet any timescales agreed with the Company.

4.2 The Contractor will determine how and when the Services are performed, but will co-operate with the Company's reasonable requirements, attend meetings and give progress reports as reasonably requested, and comply with the Company's policies on security, confidentiality and data protection.

4.3 The Contractor will not commit the Company to any contract or liability without the Company's prior written consent.

4.4 If any deliverable does not meet the standard in Clause 4.1 or the agreed requirements, the Company may reject it by written notice giving reasons, and the Contractor will promptly correct and re-deliver the work at the Contractor's own cost. The Company may withhold payment for a rejected deliverable until it has been corrected and accepted.`,
    },
    {
      id: "ct-5",
      heading: "5. Substitution",
      only_for: "contractor",
      body: `5.1 The Contractor may, with the Company's prior written approval (not to be unreasonably withheld), provide a suitably qualified substitute to perform the Services. The Contractor remains responsible for the substitute's acts, for paying the substitute, and for ensuring the substitute is bound by confidentiality and intellectual-property obligations no less protective than those in this Agreement.`,
    },
    {
      id: "ct-6",
      heading: "6. Fees, invoicing and expenses",
      only_for: "contractor",
      body: `6.1 The Company will pay the Contractor the fees set out in the Engagement Schedule. The fees are exclusive of VAT, which (if applicable) the Contractor will charge in addition on a valid VAT invoice.

6.2 The Contractor will submit a valid invoice on or before the 26th day of each month for that month's Services, and the Company will pay each correctly rendered, undisputed invoice on the 28th day of that month by bank transfer. Where an invoice is received after the 26th, or is disputed, the Company will pay the correctly rendered, undisputed amount on the 28th day of the following month.

6.3 The Company will reimburse pre-approved, reasonable expenses against receipts. The Contractor otherwise bears the Contractor's own costs of providing the Services.

6.4 The Company may, at its sole and absolute discretion (exercised fairly and without unlawful discrimination), pay the Contractor a bonus. The Company may take into account performance, key performance indicators or any other factors it considers relevant when deciding whether to pay a bonus and how much, but the Contractor meeting any target or indicator does not of itself create any entitlement to a bonus. Any such bonus: (a) is entirely discretionary and is not a contractual entitlement, and the Company is under no obligation to operate any bonus scheme or to set, communicate or apply any targets; (b) does not oblige the Company to pay a bonus on any other occasion or to any other contractor, and no bonus paid on one occasion creates any expectation or precedent of another; (c) where the Company decides to pay one, will normally be paid quarterly in arrears, and is paid gross with the Contractor responsible for any tax or contributions due under Clauses 3.2 and 15; and (d) does not constitute pay for any employee or worker benefit and does not alter the Contractor's status as an independent contractor.

6.5 Any contractually agreed variable fee or revenue share is set out in the Engagement Schedule and is not affected by Clause 6.4.`,
    },
    {
      id: "ct-7",
      heading: "7. Equipment and place of work",
      only_for: "contractor",
      body: `7.1 Except where agreed otherwise in writing, the Contractor provides the Contractor's own equipment and software and may work from any location. Any Company equipment, accounts or systems made available remain the Company's property, must be used only for the Services, and must be returned on request.`,
    },
    {
      id: "ct-8",
      heading: "8. Intellectual property",
      only_for: "contractor",
      body: `8.1 All Intellectual Property Rights in any work, deliverable, design, code, copy, document or other material created by the Contractor in providing the Services (the "Work Product") will belong to the Company. The Contractor assigns to the Company, with full title guarantee and by present and (so far as possible) future assignment, all such rights, free of any third-party claim.

8.2 The Contractor irrevocably waives all moral rights in the Work Product under the Copyright, Designs and Patents Act 1988 or any equivalent law.

8.3 The Contractor will, at the Company's expense, do all things and execute all documents reasonably required to vest and protect those rights, and appoints the Company as the Contractor's attorney to do so if the Contractor fails to comply within a reasonable period.

8.4 The Contractor warrants the Work Product will be original, will not infringe any third-party rights, and will not include third-party or open-source material without the Company's prior written consent and a licence permitting the Company's use.

8.5 To the extent any materials, tools, code, components or know-how that the Contractor owned before, or developed outside, the engagement ("Background IP") are incorporated into the Work Product, the Contractor grants the Company a perpetual, irrevocable, worldwide, royalty-free, non-exclusive licence (with the right to sub-licence to the Company's Clients) to use, copy, modify and distribute that Background IP as part of the Work Product.`,
    },
    {
      id: "ct-9",
      heading: "9. Confidentiality and non-disclosure",
      only_for: "contractor",
      body: `9.1 "Confidential Information" means all information in any form, whether or not marked confidential, that the Contractor obtains in connection with the engagement relating to the Company or any Client, including: client lists, leads and relationships; the Company's pattern library, designs, templates and processes; pricing, margins, financial and commercial information; strategies, know-how and methods; software, code and systems; personal data; and the existence and terms of this Agreement.

9.2 The Contractor will: keep the Confidential Information strictly secret; use it only to provide the Services; not disclose it to any third party; and not copy or remove it except as necessary to provide the Services.

9.3 The Contractor may disclose Confidential Information only: (a) to an approved substitute or the Contractor's professional advisers who need it and are bound by equivalent confidentiality duties; or (b) where required by law or a court or regulator, in which case the Contractor will, where lawful, notify the Company first and disclose only the minimum required.

9.4 These obligations do not apply to information that is or becomes public other than through the Contractor's breach, was lawfully known to the Contractor free of any duty of confidence before disclosure, or is independently developed without using the Confidential Information.

9.5 On termination, or earlier on request, the Contractor will return or securely destroy (as the Company directs) all Confidential Information and all copies, and confirm in writing that this has been done. The obligations in this Clause 9 continue without limit of time after this Agreement ends.

9.6 The Contractor acknowledges that damages alone may not be an adequate remedy for breach of this Clause 9 and that the Company is entitled to seek injunctive relief in addition to any other remedy.`,
    },
    {
      id: "ct-10",
      heading: "10. Data protection",
      only_for: "contractor",
      body: `10.1 The Contractor will comply with the UK GDPR and the Data Protection Act 2018 (and any equivalent law applicable to the Contractor) when handling personal data, will process it only on the Company's documented instructions, will keep it secure, and will not transfer it outside the UK without the Company's prior written consent. The parties will enter into a separate data processing agreement where required.`,
    },
    {
      id: "ct-11",
      heading: "11. Contractor warranties",
      only_for: "contractor",
      body: `11.1 The Contractor warrants that the Contractor has the right and authority to enter into this Agreement, that performing the Services will not breach any obligation owed to a third party, and that the Contractor will comply with all applicable laws.`,
    },
    {
      id: "ct-12",
      heading: "12. Restrictions",
      only_for: "contractor",
      body: `12.1 To protect the Company's legitimate business interests, the Contractor will not, during the engagement and for {{ restriction_months }} months after it ends, directly or indirectly:

(a) solicit or entice away, or try to, any Client with whom the Contractor dealt or about whom the Contractor obtained Confidential Information in the 12 months before termination, for the purpose of providing competing services;

(b) provide to any such Client services that compete with those provided by the Company; or

(c) solicit, entice away, employ or engage any director, employee, contractor or consultant of the Company with whom the Contractor worked, except in response to a general advertisement not specifically targeted at that person.

12.2 Each restriction is separate and severable, and the parties consider them reasonable and necessary to protect the Company's goodwill, Confidential Information and stable team. If any restriction is unenforceable as drafted but would be enforceable if reduced in scope or duration, it applies with the modification necessary to make it enforceable.`,
    },
    {
      id: "ct-13",
      heading: "13. Termination",
      only_for: "contractor",
      body: `13.1 Either party (the Company or the Contractor) may terminate this Agreement at any time by giving the other written notice of not less than 30 days, increasing to not less than 60 days once the Contractor has provided the Services continuously for six (6) months. This is without prejudice to either party's right to terminate immediately under Clauses 13.2 and 13.3.

13.2 Either party may terminate immediately by written notice if the other commits a material breach that is not remedied within 14 days of written notice (where capable of remedy), or becomes insolvent.

13.3 The Company may terminate immediately by written notice if the Contractor commits gross misconduct, brings the Company into disrepute, or breaches Clause 8, 9, 10 or 12.`,
    },
    {
      id: "ct-14",
      heading: "14. Obligations on termination",
      only_for: "contractor",
      body: `14.1 On termination the Contractor will promptly deliver all Work Product (complete or not), Confidential Information, Company property and access credentials, and the Company will pay for Services properly performed up to the termination date.

14.2 Termination does not affect accrued rights. Clauses 3, 8, 9, 10, 12, 14, 15 and 17 to 20 survive termination.`,
    },
    {
      id: "ct-15",
      heading: "15. Indemnities",
      only_for: "contractor",
      body: `15.1 The Contractor will indemnify the Company against any income tax, National Insurance contributions (or local equivalents), interest, penalties and reasonable costs the Company is required to pay arising from the Contractor's engagement or from the Contractor being treated as anything other than self-employed, except to the extent caused by the Company's own default.

15.2 The Contractor will indemnify the Company against all losses, damages, liabilities, claims, and reasonable costs and expenses the Company suffers or incurs arising from: (a) any breach by the Contractor of Clause 8, 9 or 10; (b) any claim that the Work Product infringes a third party's Intellectual Property Rights; or (c) the Contractor's negligence, wilful default or fraud. The Contractor's liability under this Clause 15.2 is reduced to the extent the loss is caused by the Company's own act or omission.`,
    },
    {
      id: "ct-16",
      heading: "16. Insurance",
      only_for: "contractor",
      body: `16.1 Where reasonably appropriate to the Services, the Contractor will maintain adequate professional indemnity and public liability insurance and produce evidence on request.`,
    },
    {
      id: "ct-17",
      heading: "17. Limitation of liability",
      only_for: "contractor",
      body: `17.1 Nothing in this Agreement limits or excludes the Contractor's liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot lawfully be limited.

17.2 Subject to Clauses 17.1 and 17.3, the Contractor's total liability arising out of or in connection with this Agreement is limited to the greater of a sum to be agreed in writing and the total fees paid to the Contractor in the 12 months before the claim.

17.3 The limit in Clause 17.2 does not apply to the Contractor's liability under Clause 15 (Indemnities) or for breach of Clause 8, 9 or 10, none of which is subject to that limit.`,
    },
    {
      id: "ct-18",
      heading: "18. Notices",
      only_for: "contractor",
      body: `18.1 Notices must be in writing and sent to the relevant party's address in this Agreement or the Engagement Schedule (or a notified email), and are deemed received: by hand, on delivery; by post, on the second business day after posting; by email, on the next business day after sending.`,
    },
    {
      id: "ct-19",
      heading: "19. General",
      only_for: "contractor",
      body: `19.1 Entire agreement. This Agreement with the Engagement Schedule is the entire agreement between the parties about its subject matter and supersedes all prior arrangements.

19.2 Variation. No variation is effective unless in writing and signed by or on behalf of both parties.

19.3 Assignment. The Contractor may not assign or sub-contract this Agreement without the Company's prior written consent, except a permitted substitution under Clause 5. The Company may assign to a group company or successor.

19.4 Severance. If any provision is invalid or unenforceable it is deemed modified to the minimum extent necessary, or if not possible, deleted, without affecting the rest.

19.5 Waiver. A failure or delay in exercising a right is not a waiver of it.

19.6 Third parties. A person who is not a party has no rights under the Contracts (Rights of Third Parties) Act 1999 to enforce this Agreement.

19.7 Counterparts. This Agreement may be signed in counterparts, including by electronic signature.`,
    },
    {
      id: "ct-20",
      heading: "20. Governing law and jurisdiction",
      only_for: "contractor",
      body: `20.1 This Agreement and any dispute arising out of it are governed by the law of England and Wales, and the parties submit to the exclusive jurisdiction of the courts of England and Wales.`,
    },
    {
      id: "ct-schedule",
      heading: "Engagement Schedule",
      only_for: "contractor",
      body: `This schedule forms part of, and is governed by, the master terms above.

CONTRACTOR DETAILS
Contractor name: {{ person_full_name }}
Contractor address: {{ contractor_address }}
Contractor email: {{ person_email }}
Operating as: {{ operating_as }}

ROLE AND REPORTING
Role / title: {{ person_job_title }}
Reporting to: {{ reporting_to }}

DATES AND TERM
Commencement date: {{ start_date }}
Term: Rolling engagement, continuing until terminated under Clause 13
Notice period: 30 days' written notice either party, rising to 60 days after six months' continuous engagement

SERVICES
{{ services_description }}

FEES AND PAYMENT
Fee basis: {{ comp_amount }} {{ comp_currency }} per {{ comp_frequency }}
VAT: {{ vat_status }}
Invoicing: Monthly, invoice submitted by the 26th
Payment terms: Paid on the 28th of each month (late or disputed invoices roll to the 28th of the following month)
Expenses: Pre-approved, against receipts`,
    },
    /* Employee fallback - the new template is contractor-focused.
     * If an employee Person hits this template, this single clause
     * makes it clear they need a separate employment contract. */
    {
      id: "ct-emp-placeholder",
      heading: "Employment terms",
      only_for: "employee",
      body: `This template is for contractor engagements. Employee contracts are documented separately. Please contact admin to issue an employment agreement.`,
    },
  ],
  outro: `AGREED by the parties on the date stated above.

Signed for and on behalf of the COMPANY (${ECOM_LANDERS_LEGAL_NAME})

Signature: ____________________________     Date: ____________________
Name: Dylan Evans
Title / capacity: Director


Signed by the CONTRACTOR

Signature: ____________________________     Date: ____________________
Name: {{ person_full_name }}
Title / capacity: {{ person_job_title }}`,
};
