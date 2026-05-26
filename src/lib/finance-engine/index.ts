import { Bank, ProductAcceptance, SectorId, ProductId, SupportType, TermMode, MilitaryRank, NetSalaryRule, PensionRule, TermRule, MarginRule, DsrRule, SupportSettings, PersonalFinanceRules, BankCalculationResult, CalculationStatus } from '../../types';
import { calculateNetSalary } from './salary';
import { calculatePensionSalary } from './pension';
import { calculateFinanceTerm } from './term';
import { calculateHousingSupport } from './support';
import { calculateDSR } from './dsr';
import { calculateMargin } from './margin';
import { calculatePersonalFinance } from './personal-finance';
import { calculateRealEstateFinance } from './real-estate-finance';
import { runDiagnostics } from './diagnostics';

export { calculateNetSalary } from './salary';
export { calculatePensionSalary } from './pension';
export { calculateFinanceTerm } from './term';
export { calculateHousingSupport } from './support';
export { calculateDSR } from './dsr';
export { calculateMargin } from './margin';
export { calculatePersonalFinance } from './personal-finance';
export { calculateRealEstateFinance } from './real-estate-finance';
export { runDiagnostics } from './diagnostics';

export function calculateBanksFinancing(params: {
  // Inputs
  sectorId: SectorId;
  productId: ProductId;
  birthYear: number;
  birthMonth: number;
  appointmentYear?: number;
  appointmentMonth?: number;
  rankId?: string;
  salaryMode: 'direct' | 'details';
  basicSalary?: number;
  housingAllowance?: number;
  otherAllowances?: number;
  directNetSalary?: number;
  directPensionSalary?: number;
  obligations: number;
  supportType: SupportType;
  selectedBankId: 'all' | string;
  termMode: TermMode;
  manualTermMonths?: number;

  // Active configurations state
  banks: Bank[];
  products: ProductAcceptance[];
  militaryRanks: MilitaryRank[];
  salaryRules: NetSalaryRule[];
  pensionRules: PensionRule[];
  marginRules: MarginRule[];
  dsrRules: DsrRule[];
  supportSettings: SupportSettings;
  personalRules: PersonalFinanceRules[];
}): BankCalculationResult[] {
  const {
    sectorId,
    productId,
    birthYear,
    birthMonth,
    appointmentYear,
    appointmentMonth,
    rankId,
    salaryMode,
    basicSalary = 0,
    housingAllowance = 0,
    otherAllowances = 0,
    directNetSalary = 0,
    directPensionSalary = 0,
    obligations,
    supportType,
    selectedBankId,
    termMode,
    manualTermMonths = 300,

    banks,
    products,
    militaryRanks,
    salaryRules,
    pensionRules,
    marginRules,
    dsrRules,
    supportSettings,
    personalRules
  } = params;

  // Determine current age in years
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentAgeYears = Math.floor(((currentYear - birthYear) * 12 + (currentMonth - birthMonth)) / 12);

  // Determine service months today
  let serviceMonthsCurrent = 0;
  if (sectorId !== 'retired' && appointmentYear && appointmentMonth) {
    serviceMonthsCurrent = (currentYear - appointmentYear) * 12 + (currentMonth - appointmentMonth);
  }

  // Filter banks to calculate
  const targetBanks = selectedBankId === 'all'
    ? banks.filter(b => b.isActive)
    : banks.filter(b => b.id === selectedBankId && b.isActive);

  const results: BankCalculationResult[] = [];

  for (const bank of targetBanks) {
    // 1. Calculate Net Salary
    const netSalaryResult = calculateNetSalary({
      sectorId,
      basicSalary,
      housingAllowance,
      otherAllowances,
      method: salaryMode,
      directNetSalary,
      rules: salaryRules
    });
    const solvedNetSalary = netSalaryResult.netSalary;

    // 2. Identify retirement age
    const matchedPensionRule = pensionRules.find(r => r.sectorId === sectorId);
    const ageCalcCalendar = matchedPensionRule?.ageCalcCalendar || 'gregorian';

    let retirementAge = matchedPensionRule?.retirementAge || 60;
    if (sectorId === 'military' && rankId) {
      const matchedRank = militaryRanks.find(r => r.id === rankId);
      if (matchedRank) retirementAge = matchedRank.retirementAge;
    }
    const displayRetirementAge = retirementAge; // القيمة للعرض (قبل التحويل)
    if (ageCalcCalendar === 'hijri') {
      retirementAge = retirementAge * 0.9707;
    }

    // Calculate pension salary
    const pensionResult = calculatePensionSalary({
      sectorId,
      basicSalary: salaryMode === 'direct'
        ? Math.round(solvedNetSalary * 0.65)
        : basicSalary,
      birthYear,
      birthMonth,
      appointmentYear,
      appointmentMonth,
      retirementAgeCustom: retirementAge,
      pensionMultiplierCustom: matchedPensionRule?.pensionMultiplier,
      directPensionSalary: sectorId === 'retired' ? directPensionSalary : undefined
    });

    // 3. Obtain bank product acceptance criteria
    let ruleProductId: string = 'real_estate_only';
    if (productId === 'personal' || productId === 'personal_only') {
      ruleProductId = 'personal_only';
    } else if (productId === 'both' || productId === 'real_estate_with_new_personal') {
      ruleProductId = 'real_estate_with_new_personal';
    } else if (productId === 'real_estate_with_personal_existing' || productId === 'real_estate_with_existing_personal') {
      ruleProductId = 'real_estate_with_existing_personal';
    } else {
      ruleProductId = 'real_estate_only';
    }

    const acceptance = products.find(p => p.bankId === bank.id && p.productId === ruleProductId);

    // 4. Calculate Mortgage duration limit
    const termResult = calculateFinanceTerm({
      bankId: bank.id,
      sectorId,
      birthYear,
      birthMonth,
      retirementAge,
      displayRetirementAge: Math.round(displayRetirementAge),
      maxTermMonthsBank: bank.maxTermMonths,
      maxAgeAtEndBank: bank.maxAgeAtEnd,
      monthsAfterRetirementBank: bank.monthsAfterRetirement,
      allowAfterRetirementBank: bank.allowAfterRetirement,
      selectedMode: termMode,
      manualTermMonths: manualTermMonths
    });

    // 5. Calculate Housing Support (Sakani) subsidies
    const supportResult = calculateHousingSupport({
      netSalary: solvedNetSalary,
      supportType,
      settings: supportSettings
    });

    // 6. Calculate Debt Service Ratio (DSR) limits
    const dsrBeforeResult = calculateDSR({
      bankId: bank.id,
      productId: (productId === 'both' || productId === 'real_estate_with_personal_existing') ? 'real_estate' : productId,
      sectorId,
      supportType,
      phase: sectorId === 'retired' ? 'retired' : 'before_retirement',
      netSalary: solvedNetSalary,
      dsrRules
    });

    const dsrAfterResult = calculateDSR({
      bankId: bank.id,
      productId: (productId === 'both' || productId === 'real_estate_with_personal_existing') ? 'real_estate' : productId,
      sectorId,
      supportType,
      phase: sectorId === 'retired' ? 'retired' : 'after_retirement',
      netSalary: pensionResult.pensionSalary,
      dsrRules
    });

    // 7. Calculate interest margins using interpolation
    const marginResult = calculateMargin({
      bankId: bank.id,
      productId: (productId === 'both' || productId === 'real_estate_with_personal_existing') ? 'real_estate' : productId,
      supportType,
      sectorId,
      termMonths: termResult.totalMonths,
      marginRules
    });

    // 8. Personal loan calculation (if applicable)
    let personalLoanAmount = 0;
    let personalInstallment = 0;
    let personalMonths = 0;
    let personalRepayment = 0;
    let personalProfit = 0;
    let personalCalcMethod: 'multiplier' | 'pmt' | undefined = undefined;

    if (productId === 'personal' || productId === 'personal_only' || productId === 'both' || productId === 'real_estate_with_new_personal') {
      const personalCalc = calculatePersonalFinance({
        netSalary: solvedNetSalary,
        obligations,
        sectorId,
        bankId: bank.id,
        rules: personalRules,
        productId
      });
      personalLoanAmount = personalCalc.personalFinanceAmount;
      personalInstallment = personalCalc.monthlyInstallment;
      personalMonths = personalCalc.termMonths;
      personalRepayment = personalCalc.totalRepayment;
      personalProfit = personalCalc.profitAmount;
      personalCalcMethod = personalCalc.calculationMethod;
    }

    // 9. Real estate calculation (incorporating dual loans constraints)
    let reLoanAmount = 0;
    let installmentBefore = 0;
    let installmentAfter = 0;
    let purchasingPower = 0;

    if (productId === 'real_estate' || productId === 'real_estate_with_personal_existing' || productId === 'both') {
      // If dual (both) is selected, personalInstallment reduces real estate spending limit
      // for the first 60 months (lifetime of personal loan)!
      const adjustedObligationsBeforeVal = obligations + (productId === 'both' ? personalInstallment : 0);

      const reCalc = calculateRealEstateFinance({
        netSalaryBefore: solvedNetSalary,
        pensionSalaryAfter: pensionResult.pensionSalary,
        dsrBefore: dsrBeforeResult.dsrPercentage,
        dsrAfter: dsrAfterResult.dsrPercentage,
        monthlySupport: supportResult.monthlySupport,
        downPaymentSupport: supportResult.downPaymentSupport,
        monthsBeforeRetirement: termResult.monthsBeforeRetirement,
        monthsAfterRetirement: termResult.monthsAfterRetirement,
        annualMargin: marginResult.annualMargin,
        obligations: adjustedObligationsBeforeVal,
        supportType
      });

      // Adjust for Dual (both) where we have Phase A (with personal loan) and Phase B (remained work tenure)
      if (productId === 'both') {
        const monthsInPersonal = Math.min(termResult.monthsBeforeRetirement, personalMonths);
        const monthsOutsidePersonal = Math.max(0, termResult.monthsBeforeRetirement - personalMonths);

        const installmentWithPersonal = Math.max(0, (solvedNetSalary * (dsrBeforeResult.dsrPercentage / 100)) - obligations - personalInstallment + (supportType === 'monthly' ? supportResult.monthlySupport : 0));
        const installmentWithoutPersonal = Math.max(0, (solvedNetSalary * (dsrBeforeResult.dsrPercentage / 100)) - obligations + (supportType === 'monthly' ? supportResult.monthlySupport : 0));

        let currentInstallmentAfter = 0;
        if (termResult.monthsAfterRetirement > 0) {
          currentInstallmentAfter = Math.max(0, pensionResult.pensionSalary * (dsrAfterResult.dsrPercentage / 100));
        }

        const totalDualCashflow = (installmentWithPersonal * monthsInPersonal) + (installmentWithoutPersonal * monthsOutsidePersonal) + (currentInstallmentAfter * termResult.monthsAfterRetirement);
        const denominator = 1 + (marginResult.annualMargin / 100) * (termResult.totalMonths / 12);
        
        reLoanAmount = Math.round(totalDualCashflow / denominator);
        installmentBefore = installmentWithPersonal; // initial installment active
        installmentAfter = currentInstallmentAfter;
        purchasingPower = reLoanAmount + (supportType === 'downpayment' ? supportResult.downPaymentSupport : 0);
      } else {
        reLoanAmount = reCalc.realEstateFinanceAmount;
        installmentBefore = reCalc.monthlyInstallmentBeforeRetirement;
        installmentAfter = reCalc.monthlyInstallmentAfterRetirement;
        purchasingPower = reCalc.totalPurchasingPower;
      }
    }

    // 10. Diagnostics analysis and eligibility checks
    const diag = runDiagnostics({
      bankName: bank.nameAr,
      acceptance,
      sectorId,
      productId,
      supportType,
      netSalary: solvedNetSalary,
      currentAgeYears,
      serviceMonths: serviceMonthsCurrent,
      termMonths: termResult.totalMonths,
      originalMaxTerm: bank.maxTermMonths,
      termReductionReason: termResult.reductionReason || undefined,
      isDirectSalary: salaryMode === 'direct',
      pensionRatioReduced: pensionResult.pensionSalary < solvedNetSalary && termResult.monthsAfterRetirement > 0
    });

    const isEligible = diag.status !== 'rejected';

    const isPersonalOnly = productId === 'personal' || productId === 'personal_only';

    // Push calculation result package
    results.push({
      bankId: bank.id,
      bankName: bank.nameAr,
      logoColor: bank.logoColor,
      logoText: bank.logoText,
      status: diag.status,
      isEligible,
      realEstateAmount: isEligible ? reLoanAmount : 0,
      personalAmount: isEligible ? personalLoanAmount : 0,
      housingSupportAmount: isEligible ? (supportType === 'downpayment' ? supportResult.downPaymentSupport : supportResult.monthlySupport) : 0,
      supportType: supportType,
      totalPurchasingPower: isEligible ? (isPersonalOnly ? personalLoanAmount : (purchasingPower + personalLoanAmount)) : 0,
      monthlyInstallmentBeforeRetirement: isEligible ? (isPersonalOnly ? personalInstallment : installmentBefore) : 0,
      monthlyInstallmentAfterRetirement: isEligible ? (isPersonalOnly ? 0 : installmentAfter) : 0,
      termMonths: isPersonalOnly ? personalMonths : termResult.totalMonths,
      annualMargin: isPersonalOnly
        ? (() => {
            const pr = personalRules.find(r => r.bankId === bank.id && r.isActive) || personalRules.find(r => r.bankId === 'all' && r.isActive);
            return pr ? pr.annualMargin : 2.5;
          })()
        : marginResult.annualMargin,
      dsrUsed: isPersonalOnly
        ? (() => {
            const pr = personalRules.find(r => r.bankId === bank.id && r.isActive) || personalRules.find(r => r.bankId === 'all' && r.isActive);
            return pr ? (sectorId === 'retired' ? pr.retireeDsrPercentage : pr.dsrPercentage) : (sectorId === 'retired' ? 25 : 33);
          })()
        : dsrBeforeResult.dsrPercentage,
      personalCoefficient: isPersonalOnly
        ? (() => {
            const pr = personalRules.find(r => r.bankId === bank.id && r.isActive) || personalRules.find(r => r.bankId === 'all' && r.isActive);
            return pr ? pr.financeCoefficient : 50.4;
          })()
        : undefined,
      personalTotalRepayment: isPersonalOnly ? personalRepayment : undefined,
      personalProfitAmount: isPersonalOnly ? personalProfit : undefined,
      personalCalculationMethod: isPersonalOnly ? personalCalcMethod : undefined,
      rejectionReason: !isEligible ? diag.messages[0] : undefined,
      netSalary: solvedNetSalary,
      retirementAge: Math.round(displayRetirementAge),
      pensionSalary: pensionResult.pensionSalary,
      diagnosticMessages: [
        ...(supportType !== 'none' && supportResult.appliedRule ? [supportResult.appliedRule] : []),
        ...diag.messages
      ],
      diagnosticSteps: diag.calculationSteps
    });
  }

  // Sort by highest Purchasing Power / Loan amount by default
  return results.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.totalPurchasingPower - a.totalPurchasingPower;
  });
}
