/* ── Default agreement template content ──
 *
 * IMPORTANT: this is a sensible starting point for a UK micro-agency
 * working with employees + contractors. It is NOT legal advice and
 * Dylan should review every clause with a solicitor before using these
 * agreements for any real engagement. The /company/contracts/templates
 * page exists precisely so the content can be tweaked freely without
 * touching code.
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

const ECOM_LANDERS_LEGAL_NAME = "Ecom Landers";
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

export const DEFAULT_CONTRACT_TEMPLATE: TemplateBody = {
  title: "Engagement Agreement",
  intro: `This Engagement Agreement ("Agreement") is entered into between ${ECOM_LANDERS_LEGAL_NAME} ("Company"), with its registered address at ${ECOM_LANDERS_ADDRESS}, and {{ person_full_name }} ("Team Member"), and is effective from {{ start_date }}.

This Agreement sets out the terms on which Team Member will perform services for Company in the role of {{ person_job_title }}.`,
  clauses: [
    {
      id: "ct-1",
      heading: "Engagement and services",
      body: `Company engages Team Member, and Team Member accepts the engagement, to perform the duties of {{ person_job_title }} ({{ person_employment_type }}) starting on {{ start_date }}. Team Member's responsibilities are as agreed from time to time between the parties and as set out in any role description, project brief, or pod assignment communicated by Company.`,
    },
    {
      id: "ct-2",
      heading: "Working pattern (employee)",
      only_for: "employee",
      body: `Team Member's standard working pattern is as agreed with Company at the start of engagement. Team Member is entitled to paid annual leave, paid sick leave, and statutory benefits in accordance with UK employment law and Company's policies as published from time to time. Notice of resignation is in line with the period stated in any offer letter or, absent that, statutory minimum.`,
    },
    {
      id: "ct-3",
      heading: "Working pattern (contractor)",
      only_for: "contractor",
      body: `Team Member is engaged as an independent contractor and not an employee, worker, agent, or partner of Company. Team Member is responsible for their own tax, National Insurance, and any other statutory contributions. Team Member is not entitled to paid leave, sick pay, pension contributions, or any other employee benefit from Company. The parties agree this engagement is outside IR35. Either party may terminate this engagement on seven (7) days' written notice unless otherwise agreed for a specific project.`,
    },
    {
      id: "ct-4",
      heading: "Compensation",
      body: `Company will pay Team Member {{ comp_amount }} {{ comp_currency }} per {{ comp_frequency }} for services rendered, subject to the payment cycle below. Compensation is reviewed periodically and any change is recorded in writing.`,
    },
    {
      id: "ct-5",
      heading: "Payment cycle",
      body: `Company operates a monthly payment cycle. Invoices submitted via the Launchpad team invoice portal by the 26th of a calendar month are paid on the 28th of that month. Invoices submitted later roll into the following month's cycle. Team Member is responsible for accurate calculation of fees in line with Company's published payment-structure document.`,
    },
    {
      id: "ct-6",
      heading: "Intellectual property",
      body: `All work product produced by Team Member in connection with their engagement (including but not limited to designs, code, copy, research, test plans, and analysis) is the property of Company on creation. Team Member assigns to Company all rights, title, and interest in such work product, including all intellectual property rights, and waives any moral rights they may have in such work product to the fullest extent permitted by law.`,
    },
    {
      id: "ct-7",
      heading: "Confidentiality",
      body: `Team Member's obligations regarding Company's confidential information are set out in the separate Non-Disclosure Agreement between the parties, which is incorporated into this Agreement by reference. In the event of any conflict between the two documents, the more restrictive obligation applies.`,
    },
    {
      id: "ct-8",
      heading: "Conflicts of interest",
      body: `Team Member will not, during the term of this Agreement, perform services for or take any equity interest in any business that directly competes with Company in the e-commerce conversion rate optimisation, landing page design, or Shopify development space without Company's prior written consent. Team Member is otherwise free to undertake other engagements that do not interfere with their obligations under this Agreement.`,
    },
    {
      id: "ct-9",
      heading: "Termination",
      body: `Either party may terminate this Agreement in accordance with the working-pattern clause applicable to Team Member's engagement type. On termination, Team Member will: (a) complete any in-progress work to the standard required by Company or hand it over cleanly; (b) return or destroy all Company property and Confidential Information in their possession; and (c) be paid for all services properly performed up to the termination date.`,
    },
    {
      id: "ct-10",
      heading: "Governing law",
      body: `This Agreement is governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales for any dispute arising out of or in connection with this Agreement.`,
    },
  ],
  outro: `By signing below, Team Member acknowledges that they have read, understood, and agree to be bound by the terms of this Agreement.`,
};
