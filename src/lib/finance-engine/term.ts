import { TermOutput, SectorId, TermMode } from '../../types';

export function calculateFinanceTerm(params: {
  bankId: string;
  sectorId: SectorId;
  birthYear: number;
  birthMonth: number;
  retirementAge: number;
  displayRetirementAge?: number;
  maxTermMonthsBank: number;
  maxAgeAtEndBank: number;
  monthsAfterRetirementBank: number;
  allowAfterRetirementBank: boolean;
  selectedMode: TermMode;
  manualTermMonths?: number;
}): TermOutput {
  const {
    sectorId,
    birthYear,
    birthMonth,
    retirementAge,
    displayRetirementAge,
    maxTermMonthsBank,
    maxAgeAtEndBank,
    monthsAfterRetirementBank,
    allowAfterRetirementBank,
    selectedMode,
    manualTermMonths = 300
  } = params;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentAgeMonths = Math.max(0, (currentYear - birthYear) * 12 + (currentMonth - birthMonth));
  const retirementAgeMonths = retirementAge * 12;

  // 1. Calculate months before retirement
  const monthsBeforeRetirement = Math.max(0, retirementAgeMonths - currentAgeMonths);

  // 2. Post-retirement eligibility
  let monthsAfterRetirement = 0;
  if (sectorId !== 'retired' && allowAfterRetirementBank) {
    monthsAfterRetirement = monthsAfterRetirementBank;
  }

  // 3. Max months limited by age
  const maxAgeAtEndMonths = maxAgeAtEndBank * 12;
  const remainingMonthsToMaxAge = Math.max(0, maxAgeAtEndMonths - currentAgeMonths);

  // 4. Calculate maximum allowable term based on rules
  const ruleLimitTerm = sectorId === 'retired'
    ? remainingMonthsToMaxAge
    : (monthsBeforeRetirement + monthsAfterRetirement);

  const absoluteMaxTerm = Math.min(
    maxTermMonthsBank,
    remainingMonthsToMaxAge,
    ruleLimitTerm
  );

  let totalMonths = absoluteMaxTerm;
  let reductionReason = '';

  if (selectedMode === 'until_retirement' && sectorId !== 'retired') {
    totalMonths = Math.min(absoluteMaxTerm, monthsBeforeRetirement);
    reductionReason = 'تم تحديد مدة التمويل لتنتهي عند التقاعد بناءً على طلبك.';
  } else if (selectedMode === 'manual') {
    const requested = manualTermMonths;
    if (requested > absoluteMaxTerm) {
      totalMonths = absoluteMaxTerm;
      reductionReason = 'تم تقليص المدة لتتجاوز الضوابط العمرية أو لوائح جهة الإقراض.';
    } else {
      totalMonths = requested;
    }
  }

  // Double check reductions and identify why
  if (totalMonths < maxTermMonthsBank && selectedMode === 'max') {
    if (remainingMonthsToMaxAge < maxTermMonthsBank && remainingMonthsToMaxAge <= ruleLimitTerm) {
      reductionReason = `تم تقليص مدة التمويل لتتجاوز العمر الأقصى للعميل عند نهاية التمويل البالغ ${maxAgeAtEndBank} سنة.`;
    } else if (ruleLimitTerm < maxTermMonthsBank) {
      const displayAge = displayRetirementAge ?? Math.round(retirementAge);
      reductionReason = `تم تقليص مدة التمويل بسبب بلوغ سن التقاعد (${displayAge} سنة) مع الحدود المسموح بها بعد التقاعد.`;
    }
  }

  // Compute final months apportionment (before vs after retirement)
  let actualMonthsBefore = 0;
  let actualMonthsAfter = 0;

  if (sectorId === 'retired') {
    actualMonthsBefore = 0;
    actualMonthsAfter = totalMonths;
  } else {
    actualMonthsBefore = Math.min(totalMonths, monthsBeforeRetirement);
    actualMonthsAfter = Math.max(0, totalMonths - actualMonthsBefore);
  }

  return {
    monthsBeforeRetirement: actualMonthsBefore,
    monthsAfterRetirement: actualMonthsAfter,
    totalMonths,
    totalYears: Number((totalMonths / 12).toFixed(1)),
    reductionReason,
    selectedTermMode: selectedMode
  };
}
