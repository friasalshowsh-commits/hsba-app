import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateBanksFinancing } from '../../lib/finance-engine';
import { SectorId, ProductId, SupportType, TermMode, BankCalculationResult } from '../../types';
import {
  Home, User, Coins, Briefcase, Calendar, Scale,
  ChevronLeft, ChevronRight, HelpCircle, AlertCircle, Calculator
} from 'lucide-react';
import ResultsGrid from '../results/ResultsGrid';
import NumericInput from './NumericInput';

export default function StepWizard() {
  const {
    banks,
    products,
    militaryRanks,
    salaryRules,
    pensionRules,
    marginRules,
    dsrRules,
    supportSettings,
    personalRules,
    setCalculationLogs
  } = useAppState();

  // Wizard active step (1 to 4: customer_data, salary, finance_options, results)
  const [currentStep, setCurrentStep] = useState(1);
  const [results, setResults] = useState<BankCalculationResult[] | null>(null);

  // --- Step Form Values State ---
  const [mainFinanceType, setMainFinanceType] = useState<'real_estate' | 'personal_only' | 'real_estate_with_existing_personal'>('real_estate');
  const [realEstateSubType, setRealEstateSubType] = useState<'real_estate_only' | 'real_estate_with_new_personal'>('real_estate_only');

  // Existing personal loan toggle (drives the "real estate with existing personal" path)
  const [hasExistingPersonal, setHasExistingPersonal] = useState<boolean>(false);

  const [productId, setProductId] = useState<ProductId>('real_estate');
  const [sectorId, setSectorId] = useState<SectorId>('government_civilian');
  const [rankId, setRankId] = useState<string>('jundi');

  // Dates
  const [birthYear, setBirthYear] = useState<number>(1990);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthCalendar, setBirthCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const [appointmentYear, setAppointmentYear] = useState<number>(2015);
  const [appointmentMonth, setAppointmentMonth] = useState<number>(1);
  const [appointmentDay, setAppointmentDay] = useState<number>(1);
  const [appointmentCalendar, setAppointmentCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  // Salary
  const [salaryMode, setSalaryMode] = useState<'direct' | 'details'>('direct');
  const [directNetSalary, setDirectNetSalary] = useState<number>(12000);
  const [directPensionSalary, setDirectPensionSalary] = useState<number>(8000);
  const [basicSalary, setBasicSalary] = useState<number>(9000);
  const [housingAllowance, setHousingAllowance] = useState<number>(2250);
  const [otherAllowances, setOtherAllowances] = useState<number>(1500);

  // Finance details
  const [supportType, setSupportType] = useState<SupportType>('none');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [termMode, setTermMode] = useState<TermMode>('max');
  const [manualTermYears, setManualTermYears] = useState<number>(25);

  const [existingPersonalLoanPayment, setExistingPersonalLoanPayment] = useState<number>(0);
  const [existingPersonalRemainingMonths, setExistingPersonalRemainingMonths] = useState<number>(0);
  const [otherObligations, setOtherObligations] = useState<number>(0);
  const [obligations, setObligations] = useState<number>(0);

  // Validation errors
  const [errors, setErrors] = useState<string[]>([]);

  // Compute live local calculated Net salary to aid real-time UI display
  const [localCalculatedNet, setLocalCalculatedNet] = useState(12000);

  // Sync main finance type with the existing-personal toggle
  useEffect(() => {
    if (hasExistingPersonal) {
      setMainFinanceType('real_estate_with_existing_personal');
    } else {
      setMainFinanceType('real_estate');
    }
  }, [hasExistingPersonal]);

  // Sync Product ID with Main/Sub choices
  useEffect(() => {
    if (mainFinanceType === 'personal_only') {
      setProductId('personal');
    } else if (mainFinanceType === 'real_estate_with_existing_personal') {
      setProductId('real_estate_with_personal_existing');
    } else {
      if (realEstateSubType === 'real_estate_only') {
        setProductId('real_estate');
      } else {
        setProductId('both');
      }
    }
  }, [mainFinanceType, realEstateSubType]);

  // Sync Obligations with inputs
  useEffect(() => {
    if (mainFinanceType === 'real_estate_with_existing_personal') {
      setObligations(existingPersonalLoanPayment + otherObligations);
    } else {
      setObligations(otherObligations);
    }
  }, [mainFinanceType, existingPersonalLoanPayment, otherObligations]);

  useEffect(() => {
    if (salaryMode === 'direct') {
      setLocalCalculatedNet(directNetSalary);
    } else {
      const rule = salaryRules.find(r => r.sectorId === sectorId && r.isActive) || {
        deductionPercentage: 9.0,
        deductionBase: 'basic_housing' as const
      };
      const gross = basicSalary + housingAllowance + otherAllowances;
      let dBase = basicSalary + housingAllowance;
      if (rule.deductionBase === 'basic_only') dBase = basicSalary;
      else if (rule.deductionBase === 'total') dBase = gross;

      const deduction = (dBase * rule.deductionPercentage) / 100;
      setLocalCalculatedNet(Math.round(gross - deduction));
    }
  }, [salaryMode, directNetSalary, basicSalary, housingAllowance, otherAllowances, sectorId, salaryRules]);

  // Simplified 3-step structure: customer data -> salary -> finance options -> results
  type StepId =
    | 'customer_data'
    | 'salary'
    | 'finance_options'
    | 'results';

  const flow: StepId[] = [
    'customer_data',
    'salary',
    'finance_options',
    'results'
  ];

  const activeStepId = flow[currentStep - 1] || 'customer_data';

  const hijriToGreg = (year: number, calendar: 'gregorian' | 'hijri'): number => {
    if (calendar === 'hijri') {
      return Math.round(year * 0.9707 + 621.57);
    }
    return year;
  };

  // Handle Step validations
  const validateStep = (stepNumber: number): boolean => {
    const stepErrors: string[] = [];
    const stepId = flow[stepNumber - 1];

    if (stepId === 'customer_data') {
      const currentYear = 2026;

      // Validate birth month & year ranges
      if (!birthMonth || birthMonth < 1 || birthMonth > 12) {
        stepErrors.push('يرجى إدخال شهر ميلاد صحيح بين 1 و 12.');
      }
      const minBirthYear = birthCalendar === 'gregorian' ? 1940 : 1360;
      const maxBirthYear = birthCalendar === 'gregorian' ? 2008 : 1429;
      if (!birthYear || birthYear < minBirthYear || birthYear > maxBirthYear) {
        stepErrors.push(`يرجى إدخال سنة ميلاد صحيحة بين ${minBirthYear} و ${maxBirthYear} للتقويم المختار.`);
      }

      // Check age only if birthYear is in range
      if (birthYear && birthYear >= minBirthYear && birthYear <= maxBirthYear) {
        const ageYears = currentYear - hijriToGreg(birthYear, birthCalendar);
        if (ageYears < 18) {
          stepErrors.push('يجب ألا يقل عمر طالب التمويل عن 18 عاماً.');
        }
      }

      if (sectorId !== 'retired') {
        if (!appointmentMonth || appointmentMonth < 1 || appointmentMonth > 12) {
          stepErrors.push('يرجى إدخال شهر تعيين صحيح بين 1 و 12.');
        }
        const minAppYear = appointmentCalendar === 'gregorian' ? 1970 : 1390;
        const maxAppYear = appointmentCalendar === 'gregorian' ? 2026 : 1447;
        if (!appointmentYear || appointmentYear < minAppYear || appointmentYear > maxAppYear) {
          stepErrors.push(`يرجى إدخال سنة تعيين صحيحة بين ${minAppYear} و ${maxAppYear} للتقويم المختار.`);
        }

        if (appointmentYear && birthYear) {
          if (hijriToGreg(appointmentYear, appointmentCalendar) < hijriToGreg(birthYear, birthCalendar) + 15) {
            stepErrors.push('تاريخ التعيين لا يمكن أن يسبق السن القانوني للعمل من تاريخ الميلاد.');
          }
          if (appointmentYear > currentYear) {
            stepErrors.push('تاريخ التعيين لا يمكن أن يكون وتاريخاً مستقبلياً من اليوم.');
          }
        }
      }
    }

    if (stepId === 'salary') {
      if (salaryMode === 'direct' || sectorId === 'retired') {
        if (sectorId === 'retired' && directPensionSalary <= 0) {
          stepErrors.push('يرجى إدخال الراتب التقاعدي الصافي المستلم صحيح أكبر من الصفر.');
        } else if (sectorId !== 'retired' && directNetSalary <= 0) {
          stepErrors.push('يرجى إدخال مبلغ الراتب الصافي الكلي صحيح أكبر من الصفر.');
        }
      } else {
        if (basicSalary <= 0) {
          stepErrors.push('يرجى إدخال الراتب الأساسي الخاص بك بدقة.');
        }
      }
    }

    if (stepId === 'finance_options') {
      if (termMode === 'manual') {
        if (!manualTermYears || manualTermYears < 1 || manualTermYears > 30) {
          stepErrors.push('يرجى إدخال مدة تمويل مستهدفة صحيحة بين 1 و 30 سنة.');
        }
      }
    }

    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors([]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Trigger Calculations
  const triggerCalculations = () => {
    if (!validateStep(currentStep)) return;

    const birthYearGregorian = hijriToGreg(birthYear, birthCalendar);
    const appointmentYearGregorian = hijriToGreg(appointmentYear, appointmentCalendar);

    const calcParams = {
      sectorId,
      productId,
      birthYear: birthYearGregorian,
      birthMonth,
      appointmentYear: sectorId === 'retired' ? undefined : appointmentYearGregorian,
      appointmentMonth: sectorId === 'retired' ? undefined : appointmentMonth,
      rankId: sectorId === 'military' ? rankId : undefined,
      salaryMode,
      basicSalary,
      housingAllowance,
      otherAllowances,
      directNetSalary,
      directPensionSalary,
      obligations,
      supportType,
      selectedBankId,
      termMode,
      manualTermMonths: termMode === 'manual' ? manualTermYears * 12 : undefined,

      banks,
      products,
      militaryRanks,
      salaryRules,
      pensionRules,
      marginRules,
      dsrRules,
      supportSettings,
      personalRules
    };

    const calculationResults = calculateBanksFinancing(calcParams);
    setResults(calculationResults);

    // Save calculation to logs state to populate Admin Diagnostics log history!
    const bestMatch = calculationResults[0];
    if (bestMatch) {
      const newLog = {
        id: `log_calc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        bankId: bestMatch.bankId,
        productId,
        netSalary: bestMatch.netSalary,
        termMonths: bestMatch.termMonths,
        margin: bestMatch.annualMargin,
        dsrBefore: bestMatch.dsrUsed,
        financeAmount: bestMatch.totalPurchasingPower,
        status: bestMatch.status,
        rejectionReason: bestMatch.rejectionReason,
        diagnosticSteps: bestMatch.diagnosticSteps
      };
      setCalculationLogs(prev => [newLog, ...prev]);
    }

    setCurrentStep(flow.length);
  };

  const restartWizard = () => {
    setResults(null);
    setCurrentStep(1);
  };

  return (
    <div className="w-full bg-[#F5F7FA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Step Wizard visual Progress stepper indicators */}
        {currentStep < flow.length && (
          <div className="mb-8 select-none">
            <div className="flex items-center justify-between">
              {flow.slice(0, -1).map((stepId, index) => {
                const s = index + 1;
                const isActive = s === currentStep;
                const isCompleted = s < currentStep;

                let stepLabel = '';
                if (stepId === 'customer_data') stepLabel = 'بيانات العميل';
                else if (stepId === 'salary') stepLabel = 'الراتب والدخل';
                else if (stepId === 'finance_options') stepLabel = 'خيارات التمويل';

                return (
                  <div key={stepId} className="flex flex-col items-center flex-1 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                      isActive
                        ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-md scale-110'
                        : isCompleted
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}>
                      {isCompleted ? '✓' : s}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-semibold mt-2 ${isActive ? 'text-[#0057B8] font-bold' : 'text-[#6B7280]'}`}>
                      {stepLabel}
                    </span>
                    {index < flow.length - 2 && (
                      <div className={`absolute top-5 -left-1/2 w-full h-[2px] -z-10 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Validation Alert */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>تنبيه التحقق من صحة المدخلات:</span>
            </div>
            {errors.map((err, i) => (
              <p key={i} className="list-disc pr-4">{err}</p>
            ))}
          </div>
        )}

        {/* Main Step Cards Form container */}
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 md:p-10 shadow-xs">

          {/* STEP 1: Customer Data (sector + rank + dates) */}
          {activeStepId === 'customer_data' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center max-w-lg mx-auto">
                <h3 className="text-xl font-bold text-[#111827]">بيانات العميل</h3>
                <p className="text-sm text-[#6B7280] mt-1">حدد جهة العمل وتواريخك الأساسية لتأسيس السن وأشهر الخدمة بدقة لكافة البنوك.</p>
              </div>

              {/* Employment sector */}
              <div className="space-y-4">
                <span className="block text-xs font-bold text-gray-700">جهة العمل / القطاع المهني:</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'government_civilian', label: 'حكومي مدني', icon: Briefcase },
                    { id: 'military', label: 'عسكري حربي', icon: User },
                    { id: 'private', label: 'القطاع الخاص', icon: Home },
                    { id: 'retired', label: 'متقاعد حالي', icon: Coins }
                  ].map((sec) => (
                    <div
                      key={sec.id}
                      onClick={() => {
                        setSectorId(sec.id as SectorId);
                        if (sec.id === 'retired') setSalaryMode('direct');
                      }}
                      className={`border rounded-2xl p-5 text-center cursor-pointer transition-all ${
                        sectorId === sec.id
                          ? 'border-[#0057B8] bg-[#0057B8]/5'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <sec.icon className={`w-6 h-6 mx-auto mb-2 ${sectorId === sec.id ? 'text-[#0057B8]' : 'text-gray-500'}`} />
                      <span className="text-xs font-bold text-[#111827] block">{sec.label}</span>
                    </div>
                  ))}
                </div>

                {/* Rank selector shown for military only */}
                {sectorId === 'military' && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 animate-fade-in">
                    <label className="block text-xs font-bold text-gray-700 mb-2">الرتبة العسكرية للعميل:</label>
                    <select
                      id="rank-select"
                      value={rankId}
                      onChange={(e) => setRankId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] focus:border-transparent"
                    >
                      {militaryRanks.filter(r => r.isActive).map((rank) => (
                        <option key={rank.id} value={rank.id}>
                          {rank.nameAr} (سن تقاعد الرتبة: {rank.retirementAge} سنة)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dob Card */}
                <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#0057B8]" />
                      <span>تاريخ الميلاد:</span>
                    </span>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setBirthCalendar('gregorian')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${birthCalendar === 'gregorian' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        ميلادي
                      </button>
                      <button
                        type="button"
                        onClick={() => setBirthCalendar('hijri')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${birthCalendar === 'hijri' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        هجري
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">الشهر (1 - 12)</label>
                      <NumericInput
                        id="birth-month-input"
                        min={1}
                        max={12}
                        allowDecimals={false}
                        placeholder="05"
                        value={birthMonth}
                        onChange={setBirthMonth}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">السنة</label>
                      <NumericInput
                        id="birth-year-input"
                        min={birthCalendar === 'gregorian' ? 1940 : 1360}
                        max={birthCalendar === 'gregorian' ? 2008 : 1429}
                        allowDecimals={false}
                        placeholder={birthCalendar === 'gregorian' ? '1990' : '1410'}
                        value={birthYear}
                        onChange={setBirthYear}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                    </div>
                  </div>
                </div>

                {/* Appointment date Card (except retiree) */}
                {sectorId !== 'retired' ? (
                  <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>تاريخ المباشرة / التعيين:</span>
                      </span>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setAppointmentCalendar('gregorian')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${appointmentCalendar === 'gregorian' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          ميلادي
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentCalendar('hijri')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${appointmentCalendar === 'hijri' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          هجري
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">الشهر (1 - 12)</label>
                        <NumericInput
                          id="appointment-month-input"
                          min={1}
                          max={12}
                          allowDecimals={false}
                          placeholder="09"
                          value={appointmentMonth}
                          onChange={setAppointmentMonth}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">السنة</label>
                        <NumericInput
                          id="appointment-year-input"
                          min={appointmentCalendar === 'gregorian' ? 1970 : 1390}
                          max={appointmentCalendar === 'gregorian' ? 2026 : 1447}
                          allowDecimals={false}
                          placeholder={appointmentCalendar === 'gregorian' ? '2015' : '1436'}
                          value={appointmentYear}
                          onChange={setAppointmentYear}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex flex-col justify-center animate-fade-in">
                    <p className="text-xs text-amber-800 leading-relaxed font-sans">
                      بما أن جهة العمل المختارة هي <strong>"متقاعد حالي"</strong>، فلن نطلب تاريخ مباشرة العمل ولا الرتبة، ويتم الاعتماد على السن والراتب التقاعدي الصافي.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Salary & Income */}
          {activeStepId === 'salary' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">الراتب والدخل</h3>
                <p className="text-sm text-[#6B7280] mt-1">يُشترط الإدخال الصحيح للراتب لتقرير عوامل الاستقطاع ونسب الملاءمة ائتمانياً لدى كافة البنوك.</p>
              </div>

              {/* Sub tabs: manual net vs detailed */}
              {sectorId !== 'retired' && (
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200">
                  <button
                    id="salary-direct-tab"
                    onClick={() => setSalaryMode('direct')}
                    className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all ${
                      salaryMode === 'direct'
                        ? 'bg-white text-[#0057B8] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    صافي مباشر
                  </button>
                  <button
                    id="salary-details-tab"
                    onClick={() => setSalaryMode('details')}
                    className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all ${
                      salaryMode === 'details'
                        ? 'bg-white text-[#0057B8] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    تفاصيل الراتب (الأساسي والبدلات)
                  </button>
                </div>
              )}

              {/* Form elements */}
              {salaryMode === 'direct' || sectorId === 'retired' ? (
                <div className="space-y-4 animate-fade-in">
                  {sectorId === 'retired' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">الراتب التقاعدي الصافي المستلم شهريًا:</label>
                      <div className="relative">
                        <NumericInput
                          id="retired-salary-input"
                          min={0}
                          allowDecimals={true}
                          value={directPensionSalary}
                          onChange={setDirectPensionSalary}
                          placeholder="مثال: 8000"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال سعودي</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">صافي الراتب الكلي (المحول للبنك):</label>
                      <div className="relative">
                        <NumericInput
                          id="direct-salary-input"
                          min={0}
                          allowDecimals={true}
                          value={directNetSalary}
                          onChange={setDirectNetSalary}
                          placeholder="مثال: 12500"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال سعودي</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">الراتب الأساسي:</label>
                    <div className="relative">
                      <NumericInput
                        id="basic-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={basicSalary}
                        onChange={setBasicSalary}
                        placeholder="مثال: 9000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">بدل السكن:</label>
                    <div className="relative">
                      <NumericInput
                        id="housing-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={housingAllowance}
                        onChange={setHousingAllowance}
                        placeholder="مثال: 2250"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">بدلات أخرى:</label>
                    <div className="relative">
                      <NumericInput
                        id="other-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={otherAllowances}
                        onChange={setOtherAllowances}
                        placeholder="مثال: 1500"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-bold">صافي الراتب المتوقع بعد خصم المعاشات:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{(localCalculatedNet).toLocaleString('ar-SA')} ريال سعودي</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Finance Options */}
          {activeStepId === 'finance_options' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">خيارات التمويل</h3>
                <p className="text-sm text-[#6B7280] mt-1">اختر نوع المنتج والدعم والبنك والمدة. أي تغيير هنا يحدّث النتائج مباشرة دون الرجوع للخطوات السابقة.</p>
              </div>

              {/* Product type */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-gray-700">نوع المنتج:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    id="product-re-only"
                    onClick={() => setRealEstateSubType('real_estate_only')}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all flex items-center gap-4 ${
                      realEstateSubType === 'real_estate_only' ? 'border-[#0057B8] bg-[#0057B8]/5' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-11 h-11 shrink-0 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#111827] text-sm">عقاري فقط</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">حساب التمويل العقاري بدون تمويل شخصي جديد.</p>
                    </div>
                  </div>

                  <div
                    id="product-re-plus-personal"
                    onClick={() => setRealEstateSubType('real_estate_with_new_personal')}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all flex items-center gap-4 ${
                      realEstateSubType === 'real_estate_with_new_personal' ? 'border-[#0057B8] bg-[#0057B8]/5' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-11 h-11 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#111827] text-sm">عقاري + شخصي جديد</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">حساب التمويل العقاري مع تمويل شخصي جديد ضمن الحسبة.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing personal loan question */}
              <div className="border border-gray-200 bg-white rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">هل لديك تمويل شخصي قائم؟</span>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setHasExistingPersonal(false)}
                      className={`px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${!hasExistingPersonal ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      لا
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasExistingPersonal(true)}
                      className={`px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${hasExistingPersonal ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      نعم
                    </button>
                  </div>
                </div>

                {hasExistingPersonal && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">القسط الشهري الحالي:</label>
                      <div className="relative">
                        <NumericInput
                          id="existing-personal-payment-input"
                          min={0}
                          allowDecimals={true}
                          value={existingPersonalLoanPayment}
                          onChange={setExistingPersonalLoanPayment}
                          placeholder="مثال: 1200"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">المدة المتبقية (بالشهور):</label>
                      <div className="relative">
                        <NumericInput
                          id="existing-personal-remaining-input"
                          min={0}
                          allowDecimals={false}
                          value={existingPersonalRemainingMonths}
                          onChange={setExistingPersonalRemainingMonths}
                          placeholder="مثال: 24"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">شهر</span>
                      </div>
                    </div>
                    <p className="md:col-span-2 text-[11px] text-[#0057B8] bg-[#0057B8]/5 rounded-xl px-3 py-2 leading-relaxed">
                      سيتم احتساب المسار تلقائياً كـ <strong>"عقاري مع شخصي قائم"</strong> ويخصم القسط الحالي من الاستقطاع.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Sakani Program (Mortgage support) */}
                <div className="border border-gray-200 bg-white rounded-2xl p-5">
                  <label className="block text-xs font-bold text-gray-700 mb-3 flex items-center justify-between">
                    <span>برنامج الدعم السكني (سكني):</span>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'غير مدعوم' },
                      { id: 'monthly', label: 'دعم شهري' },
                      { id: 'downpayment', label: 'دعم دفعة' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSupportType(st.id as SupportType)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          supportType === st.id
                            ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8]'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Term Option Mode */}
                <div className="border border-[#E5E7EB] bg-white rounded-2xl p-5">
                  <label className="block text-xs font-bold text-gray-700 mb-3">المدة المستهدفة للتمويل العقاري:</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { id: 'max', label: 'المدة الأقصى' },
                      { id: 'until_retirement', label: 'حتى التقاعد' },
                      { id: 'manual', label: 'اختيار يدوي' }
                    ].map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => setTermMode(tm.id as TermMode)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          termMode === tm.id
                            ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8]'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {tm.label}
                      </button>
                    ))}
                  </div>

                  {termMode === 'manual' && (
                    <div className="mt-3 space-y-2 animate-fade-in">
                      <label className="block text-[10px] font-bold text-gray-400">عدد سنوات التمويل المستهدفة (بحد أقصى 30 سنة):</label>
                      <div className="relative">
                        <NumericInput
                          id="manual-term-years-input"
                          min={1}
                          max={30}
                          allowDecimals={false}
                          placeholder="مثال: 30"
                          value={manualTermYears}
                          onChange={setManualTermYears}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">سنة</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Bank Filter */}
                <div className="border border-gray-200 bg-white rounded-2xl p-5">
                  <label className="block text-xs font-bold text-gray-700 mb-2">البنك:</label>
                  <select
                    id="bank-filter-select"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                  >
                    <option value="all">جميع البنوك النشطة (مقارنة العروض)</option>
                    {banks.filter(b => b.isActive).map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Other monthly obligations */}
                <div className="border border-gray-200 bg-white rounded-2xl p-5">
                  <label className="block text-xs font-bold text-gray-700 mb-2">التزامات شهرية أخرى (إن وجدت):</label>
                  <div className="relative">
                    <NumericInput
                      id="other-obligations-input"
                      min={0}
                      allowDecimals={true}
                      value={otherObligations}
                      onChange={setOtherObligations}
                      placeholder="مثال: 500"
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ريال شهرياً</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          {currentStep < flow.length && (
            <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8">
              <button
                id="prev-step-btn"
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs leading-none hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>رجوع</span>
              </button>

              {currentStep < flow.length - 1 ? (
                <button
                  id="next-step-btn"
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-[#0057B8] text-white font-semibold text-xs leading-none hover:bg-[#004494] cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-blue-100"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="calc-submit-btn"
                  type="button"
                  onClick={triggerCalculations}
                  className="px-8 py-3.5 rounded-xl bg-[#0057B8] text-white font-bold text-sm leading-none hover:bg-[#004494] transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Calculator className="w-4 h-4" />
                  <span>احسب النتائج ومقارنة العروض</span>
                </button>
              )}
            </div>
          )}

          {/* RESULTS DISPLAY PAGE */}
          {currentStep === flow.length && results && (
            <ResultsGrid
              results={results}
              productId={productId}
              onRestart={restartWizard}
              existingPersonalLoanPayment={existingPersonalLoanPayment}
              otherObligations={otherObligations}
              mainFinanceType={mainFinanceType}
            />
          )}

        </div>
      </div>
    </div>
  );
}
