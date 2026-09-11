import { Donation, Beneficiary } from '../types';
import { parseAmount } from './formatters';

export interface YearlyAuditSummary {
  year: string;
  donations: number;
  expenses: number;
  generalExpenses: number;
  directFinancial: number;
  wheelchairAid: number;
  netBalance: number;
}

export const OFFICIAL_AUDIT_REPORT = {
  // Master Inflows
  totalDonation: 5569866,
  wheelchairDonation: 155000,
  directFinancialDonation: 1151497,
  generalDonations: 4263369,

  // Master Outflows
  generalExpenses: 3003301,
  directFinancialBeneficiaries: 1151497,
  wheelchairExpenses: 155000,
  totalExpenses: 4309798,

  // Master Balance
  remainingBalance: 1260068,

  // Yearly Breakdown
  yearlyStats: [
    {
      year: '2024',
      donations: 1300399,
      expenses: 594659,
      generalExpenses: 594659,
      directFinancial: 0,
      wheelchairAid: 0,
      netBalance: 1300399 - 594659, // 705,740
    },
    {
      year: '2025',
      donations: 1306497,
      expenses: 1306497,
      generalExpenses: 0,
      directFinancial: 1151497,
      wheelchairAid: 155000,
      netBalance: 0,
    },
    {
      year: '2026',
      donations: 1012606,
      expenses: 776272,
      generalExpenses: 776272,
      directFinancial: 0,
      wheelchairAid: 0,
      netBalance: 1012606 - 776272, // 236,334
    },
  ] as YearlyAuditSummary[],
};

/**
 * Calculates live real-time totals including verified audit baseline + newly submitted live records.
 */
export function getRealTimeFinancialMetrics(
  donations: Donation[],
  beneficiaries: Beneficiary[]
) {
  // Count only newly approved donations added live via portal or admin
  const newlyApprovedDonations = donations.filter(
    (d) =>
      d.Status === 'Approved' &&
      (d.Source === 'Live' ||
        (d as any).isLiveAdded === true)
  );

  const newBeneficiaries = beneficiaries.filter(
    (b) =>
      b.Source === 'Live' ||
      (b as any).isLiveAdded === true
  );

  const liveDonationDelta = newlyApprovedDonations.reduce(
    (sum, d) => sum + parseAmount(d.Amount),
    0
  );
  const liveExpenseDelta = newBeneficiaries.reduce(
    (sum, b) => sum + parseAmount(b.Amount),
    0
  );

  const totalDonation = OFFICIAL_AUDIT_REPORT.totalDonation + liveDonationDelta;
  const totalExpenses = OFFICIAL_AUDIT_REPORT.totalExpenses + liveExpenseDelta;
  const remainingBalance = totalDonation - totalExpenses;

  const yearsSet = new Set<string>(['2024', '2025', '2026']);
  const currentYear = new Date().getFullYear().toString();
  yearsSet.add(currentYear);

  donations.forEach((d) => {
    if (d.Date) {
      const matches = d.Date.match(/\b(20\d\d)\b/g);
      if (matches) matches.forEach((y) => yearsSet.add(y));
    }
  });

  beneficiaries.forEach((b) => {
    if (b.Date) {
      const matches = b.Date.match(/\b(20\d\d)\b/g);
      if (matches) matches.forEach((y) => yearsSet.add(y));
    }
  });

  const allYears = Array.from(yearsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const dynamicYearlyStats: YearlyAuditSummary[] = allYears.map((year) => {
    const baseStat = OFFICIAL_AUDIT_REPORT.yearlyStats.find((s) => s.year === year);
    
    // Live delta for this year
    const liveYearDonations = newlyApprovedDonations
      .filter((d) => (d.Date || '').includes(year))
      .reduce((sum, d) => sum + parseAmount(d.Amount), 0);

    const liveYearExpenses = newBeneficiaries
      .filter((b) => (b.Date || '').includes(year))
      .reduce((sum, b) => sum + parseAmount(b.Amount), 0);

    if (baseStat) {
      const totalYearDonations = baseStat.donations + liveYearDonations;
      const totalYearExpenses = baseStat.expenses + liveYearExpenses;
      return {
        ...baseStat,
        donations: totalYearDonations,
        expenses: totalYearExpenses,
        generalExpenses: baseStat.generalExpenses + liveYearExpenses,
        netBalance: totalYearDonations - totalYearExpenses,
      };
    }

    const yearDonations = donations
      .filter((d) => d.Status === 'Approved' && (d.Date || '').includes(year))
      .reduce((sum, d) => sum + parseAmount(d.Amount), 0);

    const yearExpenses = beneficiaries
      .filter((b) => (b.Date || '').includes(year))
      .reduce((sum, b) => sum + parseAmount(b.Amount), 0);

    return {
      year,
      donations: yearDonations,
      expenses: yearExpenses,
      generalExpenses: yearExpenses,
      directFinancial: 0,
      wheelchairAid: 0,
      netBalance: yearDonations - yearExpenses,
    };
  });

  return {
    totalDonation,
    wheelchairDonation: OFFICIAL_AUDIT_REPORT.wheelchairDonation,
    generalExpenses: OFFICIAL_AUDIT_REPORT.generalExpenses + liveExpenseDelta,
    directFinancialBeneficiaries: OFFICIAL_AUDIT_REPORT.directFinancialBeneficiaries,
    wheelchairExpenses: OFFICIAL_AUDIT_REPORT.wheelchairExpenses,
    totalExpenses,
    remainingBalance,
    yearly: dynamicYearlyStats,
    liveDonationDelta,
    liveExpenseDelta,
  };
}
