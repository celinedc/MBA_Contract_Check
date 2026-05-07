import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a senior employment law analyst specializing in MBA-level contract review. Your job is to extract structured data from employment contracts, offer letters, and compensation agreements.

CRITICAL INSTRUCTIONS:

1. Employment contracts are NOT standardized. Fields may appear ANYWHERE in the document and may use completely non-standard phrasing. Read the ENTIRE document before extracting.

2. For every field, look for ALL semantic equivalents:

POSITION/TITLE: "your role will be", "you are hired as", "you will serve as", "the position of", "title:", "role:", "you will be referred to as", "employed in the capacity of", "you will join as", "your designation"

LOCATION: "your primary work location", "office location", "place of employment", "you will be based in", "reporting location", "work from", "stationed at", "the [city] office", "working out of"

SALARY: "base compensation", "annual salary", "base pay", "compensation of", "you will receive", "your salary will be", "at a rate of", "total cash", "annualized base", "starting salary"

BONUS: "target bonus", "incentive compensation", "performance bonus", "at-risk pay", "variable compensation", "you will be eligible for a bonus of"

NON-COMPETE: "non-competition", "restrictive covenant", "competitive activity", "you will not engage in", "post-employment restrictions"

3. NEVER hard-code expected values. Extract ONLY what is present. If a field is absent, return null.

4. salary: extract as a NUMBER (annualized). Also capture raw text in salaryRaw.

5. level: infer from title — VP/Director/Chief/Head = "Executive", Senior/Lead/Principal = "Senior", Manager/Analyst/Associate/Consultant = "Professional", Intern/Junior/Entry = "Junior"

6. redFlags: 2-5 specific unfavorable clauses. Be concrete, name the clause.

7. positiveClauses: 2-5 specific favorable clauses. Be concrete.

8. summary: 2-3 plain-English sentences on overall offer quality.

OUTPUT: Return ONLY valid JSON, no markdown fences, no explanation.

{
  "title": string | null,
  "location": string | null,
  "salary": number | null,
  "salaryRaw": string | null,
  "bonus": string | null,
  "bonusPercent": number | null,
  "equity": string | null,
  "equityShares": number | null,
  "vestingSchedule": string | null,
  "startDate": string | null,
  "terminationType": string | null,
  "noticePeriod": string | null,
  "severance": string | null,
  "nonCompete": string | null,
  "nonSolicit": string | null,
  "nonCompeteDuration": string | null,
  "nonCompeteScope": string | null,
  "ipAssignment": string | null,
  "vacation": string | null,
  "vacationDays": number | null,
  "benefits": string | null,
  "benefitsWaitingPeriod": string | null,
  "clawback": string | null,
  "arbitration": string | null,
  "governingLaw": string | null,
  "employerName": string | null,
  "employeeName": string | null,
  "level": "Executive" | "Senior" | "Professional" | "Junior",
  "redFlags": string[],
  "positiveClauses": string[],
  "summary": string
}`;

const BENCHMARKS = {
  Executive: { salary: '$250k - $450k', min: 250000, max: 450000 },
  Senior: { salary: '$160k - $240k', min: 160000, max: 240000 },
  Professional: { salary: '$110k - $170k', min: 110000, max: 170000 },
  Junior: { salary: '$70k - $105k', min: 70000, max: 105000 },
};

function generateMarkdown(d, isAbove, isBelow) {
  const redFlagsSection = d.redFlags.length
    ? d.redFlags.map(f => `- ⚠️ ${f}`).join('\n')
    : '- No major red flags identified.';

  const positivesSection = d.positiveClauses.length
    ? d.positiveClauses.map(f => `- ✅ ${f}`).join('\n')
    : '- No standout positive clauses identified.';

  const marketStatus = isAbove ? 'above market ceiling' : isBelow ? 'below market floor' : 'within market range';

  return `# Employment Audit Report: ${d.title}

**Role Grade:** *${d.level}* | **Governing Law:** *${d.jurisdiction}* | **Location:** *${d.location}*

---

### Executive Summary

${d.summary || 'Analysis complete. Review sections below.'}

---

### I. Compensation & Equity

- **Base Salary:** *${d.salaryRaw}*
- **Market Assessment:** ${d.salaryRaw} is *${marketStatus}* for a ${d.level}-level role (benchmark: ${d.benchmark.salary})
- **Bonus:** *${d.bonus}*${d.bonusPercent ? ` — ${d.bonusPercent}% target` : ''}
- **Equity:** *${d.equity}*${d.equityShares ? ` (${d.equityShares.toLocaleString()} shares/units)` : ''}
- **Vesting Schedule:** *${d.vestingSchedule}*
- **Start Date:** *${d.startDate}*

---

### II. Termination & Severance

- **Employment Type:** *${d.terminationType}*
- **Notice Period:** *${d.noticePeriod}*
- **Severance:** *${d.severance}*
- **Clawback Provisions:** *${d.clawback}*
- **Impact:** ${d.terminationType?.toLowerCase().includes('at-will') || d.terminationType?.toLowerCase().includes('at will') ? 'At-will employment allows either party to terminate at any time with no guaranteed notice or severance.' : 'The contract establishes a defined term with structured exit conditions.'}

---

### III. Restrictive Covenants & IP

- **Non-Compete:** *${d.nonCompete}*${d.nonCompeteDuration ? ` — Duration: ${d.nonCompeteDuration}` : ''}${d.nonCompeteScope ? ` — Scope: ${d.nonCompeteScope}` : ''}
- **Non-Solicit:** *${d.nonSolicit}*
- **IP Assignment:** *${d.ipRights}*
- **Arbitration:** *${d.arbitration}*

---

### IV. Benefits & Time Off

- **PTO / Vacation:** *${d.vacation}*${d.vacationDays ? ` (${d.vacationDays} days)` : ''}
- **Benefits Package:** *${d.benefits}*
- **Benefits Waiting Period:** *${d.benefitsWaitingPeriod || 'Not Specified'}*

---

### V. Red Flags

${redFlagsSection}

---

### VI. Favorable Clauses

${positivesSection}
`;
}


export async function analyzeContract(contractText) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not found. Add it to the Antigravity Secrets panel.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPT });

  const result = await model.generateContent(
    `Analyze the following employment contract and return the structured JSON:\n\n---\n${contractText}\n---`
  );

  const rawText = result.response.text();
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let extracted;
  try {
    extracted = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned non-JSON output: ' + rawText.slice(0, 200));
  }

  const numericSalary = extracted.salary || 0;
  const level = extracted.level || 'Professional';
  const benchmark = BENCHMARKS[level] || BENCHMARKS.Professional;
  const isAbove = numericSalary > benchmark.max;
  const isBelow = numericSalary > 0 && numericSalary < benchmark.min;
  const salaryDisplay = extracted.salaryRaw || (numericSalary ? `$${numericSalary.toLocaleString()}` : 'Not Found');

  const data = {
    salary: numericSalary,
    salaryRaw: salaryDisplay,
    jurisdiction: extracted.governingLaw || 'Not Found',
    location: extracted.location || 'Not Found',
    level,
    benchmark,
    title: extracted.title || 'Not Found',
    equity: extracted.equity || 'Not Detected',
    equityShares: extracted.equityShares || null,
    vestingSchedule: extracted.vestingSchedule || 'Not Found',
    vacation: extracted.vacation || 'Not Found',
    vacationDays: extracted.vacationDays || null,
    severance: extracted.severance || 'Not Found',
    bonus: extracted.bonus || 'Not Explicitly Defined',
    bonusPercent: extracted.bonusPercent || null,
    clawback: extracted.clawback || 'None Detected',
    nonCompete: extracted.nonCompete || 'Not Found',
    nonCompeteDuration: extracted.nonCompeteDuration || null,
    nonCompeteScope: extracted.nonCompeteScope || null,
    nonSolicit: extracted.nonSolicit || 'Not Found',
    benefits: extracted.benefits || 'Standard Package',
    benefitsWaitingPeriod: extracted.benefitsWaitingPeriod || null,
    terminationType: extracted.terminationType || 'Not Found',
    noticePeriod: extracted.noticePeriod || 'Not Found',
    ipRights: extracted.ipAssignment || 'Standard IP Assignment',
    arbitration: extracted.arbitration || 'Not Found',
    startDate: extracted.startDate || 'Not Found',
    employerName: extracted.employerName || 'Not Found',
    employeeName: extracted.employeeName || 'Not Found',
    redFlags: extracted.redFlags || [],
    positiveClauses: extracted.positiveClauses || [],
    summary: extracted.summary || '',
  };

  const markdown = generateMarkdown(data, isAbove, isBelow);

  return { markdown, data };
}
