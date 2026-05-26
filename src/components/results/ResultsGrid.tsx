import React, { useState } from 'react';
import { BankCalculationResult, ProductId } from '../../types';
import { 
  Building2, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, Clock, Percent, ListCollapse,
  Download, HelpCircle, Activity, Info, Users, ChevronDown, Award
} from 'lucide-react';

interface ResultsGridProps {
  results: BankCalculationResult[];
  productId: ProductId;
  onRestart: () => void;
  existingPersonalLoanPayment?: number;
  otherObligations?: number;
  mainFinanceType?: 'real_estate' | 'personal_only' | 'real_estate_with_existing_personal';
}

export default function ResultsGrid({ 
  results, 
  productId, 
  onRestart,
  existingPersonalLoanPayment = 0,
  otherObligations = 0,
  mainFinanceType = 'real_estate'
}: ResultsGridProps) {
  const [activeSort, setActiveSort] = useState<'power' | 'installment' | 'margin' | 'term'>('power');
  const [selectedOffer, setSelectedOffer] = useState<BankCalculationResult | null>(null);

  // Apply sorting
  const sortedResults = [...results].sort((a, b) => {
    // Keep ineligible at the bottom
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    if (!a.isEligible && !b.isEligible) return 0;

    switch (activeSort) {
      case 'power':
        if (mainFinanceType === 'personal_only') {
          return b.personalAmount - a.personalAmount;
        }
        return b.totalPurchasingPower - a.totalPurchasingPower;
      case 'installment':
        return a.monthlyInstallmentBeforeRetirement - b.monthlyInstallmentBeforeRetirement;
      case 'margin':
        return a.annualMargin - b.annualMargin;
      case 'term':
        return b.termMonths - a.termMonths;
      default:
        return b.totalPurchasingPower - a.totalPurchasingPower;
    }
  });

  return (
    <div className="w-full">
      {/* Header and Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">نتائج الحسبة وعروض جهات التمويل</h2>
          <p className="text-sm text-[#6B7280]">تم حساب أفضل عروض وبدائل القروض من كافة البنوك النشطة بناءً على ضوابط ساما ومؤسسة التقاعد.</p>
        </div>
        <button
          onClick={onRestart}
          className="self-start text-sm underline text-[#0057B8] font-medium hover:text-[#0a4891] cursor-pointer"
        >
          إعادة تعبئة البيانات
        </button>
      </div>

      {/* Sorting Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 justify-start">
        <span className="text-xs font-bold text-[#6B7280] ml-2">ترتيب النتائج:</span>
        <button
          onClick={() => setActiveSort('power')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'power'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أعلى تمويل وقدرة شراء
        </button>
        <button
          onClick={() => setActiveSort('installment')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'installment'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أقل قسط شهري
        </button>
        <button
          onClick={() => setActiveSort('margin')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'margin'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أقل هامش فائدة
        </button>
        <button
          onClick={() => setActiveSort('term')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'term'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أطول فترة سداد
        </button>
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedResults.map((offer) => {
          const isApp = offer.status === 'approved';
          const isWarn = offer.status === 'warning';
          const isRej = offer.status === 'rejected';

          return (
            <div
              key={offer.bankId}
              onClick={() => setSelectedOffer(offer)}
              className={`bg-white rounded-2xl border transition-all p-6 relative flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-[#0057B8] ${
                offer.isEligible ? 'border-[#E5E7EB]' : 'border-red-100 bg-red-50/10'
              }`}
            >
              {/* Badge */}
              <div className="absolute top-4 left-4">
                {isApp && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>مقبول</span>
                  </span>
                )}
                {isWarn && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>مقبول بتحفظ</span>
                  </span>
                )}
                {isRej && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>غير مقبول</span>
                  </span>
                )}
              </div>

              {/* Bank Logo / Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${offer.logoColor} text-white flex items-center justify-center font-bold text-center text-sm p-1 select-none`}>
                  {offer.logoText}
                </div>
                <div>
                  <h3 className="font-bold text-[#111827] text-lg">{offer.bankName}</h3>
                  <p className="text-xs text-[#6B7280]">
                    {mainFinanceType === 'personal_only' 
                      ? 'مدة التمويل الشخصي: 5 سنوات (60 شهراً)' 
                      : `مدة التمويل العقاري: ${Math.floor(offer.termMonths / 12)} سنة ${offer.termMonths % 12 > 0 ? `و ${offer.termMonths % 12} أشهر` : ''}`}
                  </p>
                </div>
              </div>

              {/* Main Numbers */}
              {offer.isEligible ? (
                <div className="space-y-4 mb-6">
                  {/* Total budget */}
                  <div className="bg-[#F8FAFC] px-4 py-3.5 rounded-xl border border-[#F1F5F9]">
                    <span className="text-xs text-[#6B7280] font-semibold block mb-1">
                      {mainFinanceType === 'personal_only' 
                        ? 'مبلغ التمويل الشخصي' 
                        : mainFinanceType === 'real_estate_with_existing_personal'
                        ? 'تمويل عقاري فقط متاح'
                        : 'إجمالي القدرة الشرائية'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#0057B8]">
                        {(mainFinanceType === 'personal_only' 
                          ? offer.personalAmount 
                          : mainFinanceType === 'real_estate_with_existing_personal'
                          ? offer.realEstateAmount
                          : offer.totalPurchasingPower).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xs font-semibold text-[#6B7280]">ريال سعودي</span>
                    </div>
                  </div>

                  {/* Components */}
                  <div className="grid grid-cols-2 gap-4">
                    {mainFinanceType === 'personal_only' ? (
                      <>
                        <div className="border border-[#E5E7EB] rounded-xl p-3">
                          <span className="text-xs text-[#6B7280] block mb-0.5">هامش الربح (للعرض)</span>
                          <span className="font-bold text-[#111827]">{offer.annualMargin}%</span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3">
                          <span className="text-xs text-[#6B7280] block mb-0.5">طريقة الحساب</span>
                          <span className="font-bold text-[#111827]">{offer.personalCalculationMethod === 'pmt' ? 'PMT' : 'معامل التمويل'}</span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3">
                          <span className="text-xs text-[#6B7280] block mb-0.5">نسبة الاستقطاع المعتمدة</span>
                          <span className="font-bold text-[#111827]">{offer.dsrUsed}%</span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3">
                          <span className="text-xs text-[#6B7280] block mb-0.5">معامل التمويل المستخدم</span>
                          <span className="font-bold text-[#111827]">{offer.personalCoefficient || 50.4}</span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3">
                          <span className="text-xs text-[#6B7280] block mb-0.5">مدة التمويل</span>
                          <span className="font-bold text-[#111827]">{offer.termMonths} شهراً</span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3 col-span-2 flex justify-between items-center bg-gray-50/50">
                          <span className="text-xs font-semibold text-[#6B7280]">إجمالي السداد:</span>
                          <span className="font-bold text-slate-800">
                            {(offer.personalTotalRepayment !== undefined ? offer.personalTotalRepayment : (offer.personalAmount + (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12)))).toLocaleString('ar-SA')} ريال
                          </span>
                        </div>
                        <div className="border border-[#E5E7EB] rounded-xl p-3 col-span-2 flex justify-between items-center bg-gray-50/50">
                          <span className="text-xs font-semibold text-[#6B7280]">إجمالي الأرباح:</span>
                          <span className="font-bold text-rose-600">
                            {(offer.personalProfitAmount !== undefined ? offer.personalProfitAmount : (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12))).toLocaleString('ar-SA')} ريال
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {productId !== 'personal' && (
                          <div className="border border-[#E5E7EB] rounded-xl p-3">
                            <span className="text-xs text-[#6B7280] block mb-0.5">القرض العقاري</span>
                            <span className="font-bold text-[#111827]">{(offer.realEstateAmount).toLocaleString('ar-SA')} ريال</span>
                          </div>
                        )}
                        {productId !== 'real_estate' && mainFinanceType !== 'real_estate_with_existing_personal' && (
                          <div className="border border-[#E5E7EB] rounded-xl p-3">
                            <span className="text-xs text-[#6B7280] block mb-0.5">القرض الشخصي</span>
                            <span className="font-bold text-[#111827]">{(offer.personalAmount).toLocaleString('ar-SA')} ريال</span>
                          </div>
                        )}
                        {mainFinanceType === 'real_estate_with_existing_personal' && (
                          <div className="border border-[#E5E7EB] rounded-xl p-3">
                            <span className="text-xs text-[#6B7280] block mb-0.5">قسط شخصي قائم</span>
                            <span className="font-bold text-rose-600">{(existingPersonalLoanPayment).toLocaleString('ar-SA')} ريال</span>
                          </div>
                        )}
                        {offer.housingSupportAmount > 0 && (
                          <div className="col-span-2 bg-[#E6F4F4]/40 border border-[#0EA5A4]/20 rounded-xl p-3 flex justify-between items-center text-xs">
                            <span className="text-[#0ea5a4] font-bold">{offer.supportType === 'monthly' ? 'الدعم السكني الشهري:' : 'دعم الدفعة المباشرة:'}</span>
                            <span className="font-bold text-[#0EA5A4]">{(offer.housingSupportAmount).toLocaleString('ar-SA')} ريال{offer.supportType === 'monthly' ? ' / شهر' : ''}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Installments */}
                  <div className="pt-2 flex flex-col gap-1 text-sm">
                    {mainFinanceType === 'personal_only' ? (
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280]">قسط التمويل الشخصي:</span>
                        <span className="font-bold text-emerald-600">{(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B7280]">قسط التمويل العقاري:</span>
                          <span className="font-bold text-emerald-600">{(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال</span>
                        </div>
                        {offer.monthlyInstallmentAfterRetirement > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 mt-1 border border-amber-100">
                            <span>القسط التقاعدي العقاري:</span>
                            <span className="font-bold">{(offer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال / شهر</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-[#6B7280]">هامش الربح السنوي العقاري:</span>
                          <span className="font-bold text-[#111827]">{offer.annualMargin}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 my-6 text-sm text-red-700 min-h-[140px] flex flex-col justify-center">
                  <div className="flex gap-2 items-start">
                    <XCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold mb-1">بيانات غير مطابقة للقبول ائتمانياً</h4>
                      <p className="text-xs text-red-600/90 leading-relaxed">{offer.rejectionReason || 'العميل لا يستوفي قوانين الحد الأدنى للراتب أو مدة الخدمة المصرح بها لهذا البنك.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button className="w-full text-center py-2.5 rounded-xl border border-[#0057B8]/20 text-[#0057B8] font-semibold text-xs transition-colors hover:bg-[#0057B8] hover:text-white capitalize cursor-pointer flex items-center justify-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>عرض تفاصيل ومخطط المحاكاة</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Offers Drawer Modal */}
      {selectedOffer && (
        <div id="drawer-overlay" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-[#F5F7FA] h-full overflow-y-auto flex flex-col animate-slide-in shadow-2xl">
            {/* Drawer Header */}
            <div className={`p-6 text-white bg-gradient-to-r ${selectedOffer.logoColor} sticky top-0 z-10 flex justify-between items-center h-24`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">
                  {selectedOffer.logoText}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedOffer.bankName}</h3>
                  <p className="text-xs text-white/85">التحقيق وعجلة التشخيص للحسبة المستخرجة</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Overall Summary Stat */}
              <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs font-bold text-[#6B7280] block mb-1">
                  {mainFinanceType === 'personal_only' ? 'مبلغ التمويل الشخصي الممنوح' : 'التمويل العقاري الاستثماري'}
                </span>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-extrabold text-[#0057B8]">
                    {(mainFinanceType === 'personal_only' 
                      ? selectedOffer.personalAmount 
                      : selectedOffer.realEstateAmount).toLocaleString('ar-SA')}
                  </span>
                  <span className="text-xs font-bold text-[#6B7280]">ريال سعودي</span>
                </div>

                <div className="grid grid-cols-2 select-none md:grid-cols-3 gap-4 pt-4 border-t border-[#F1F5F9]">
                  {mainFinanceType === 'personal_only' ? (
                    <>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">هامش ربح الشخصي (للعرض)</span>
                        <span className="font-bold text-indigo-700">{selectedOffer.annualMargin}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">طريقة الحساب</span>
                        <span className="font-bold text-indigo-700">{selectedOffer.personalCalculationMethod === 'pmt' ? 'PMT' : 'معامل التمويل'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">نسبة الاستقطاع المعتمدة</span>
                        <span className="font-bold text-[#111827]">{selectedOffer.dsrUsed}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">معامل التمويل المستخدم</span>
                        <span className="font-bold text-[#111827]">{selectedOffer.personalCoefficient || 50.4}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">مدة التمويل بالشهور</span>
                        <span className="font-bold text-[#111827]">{selectedOffer.termMonths} شهراً</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">إجمالي السداد</span>
                        <span className="font-bold text-slate-800">
                          {(selectedOffer.personalTotalRepayment !== undefined ? selectedOffer.personalTotalRepayment : (selectedOffer.personalAmount + (selectedOffer.personalAmount * (selectedOffer.annualMargin / 100) * (selectedOffer.termMonths / 12)))).toLocaleString('ar-SA')} ريال
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">إجمالي الأرباح</span>
                        <span className="font-bold text-rose-600">
                          {(selectedOffer.personalProfitAmount !== undefined ? selectedOffer.personalProfitAmount : (selectedOffer.personalAmount * (selectedOffer.annualMargin / 100) * (selectedOffer.termMonths / 12))).toLocaleString('ar-SA')} ريال
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">تمويل عقاري فقط</span>
                        <span className="font-bold text-[#111827]">{(selectedOffer.realEstateAmount).toLocaleString('ar-SA')} ريال</span>
                      </div>
                      {mainFinanceType === 'real_estate_with_existing_personal' ? (
                        <div>
                          <span className="text-xs text-[#6B7280] block mb-1">قسط شخصي قائم</span>
                          <span className="font-bold text-rose-600">{(existingPersonalLoanPayment).toLocaleString('ar-SA')} ريال</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-[#6B7280] block mb-1">تمويل شخصي</span>
                          <span className="font-bold text-[#111827]">{(selectedOffer.personalAmount).toLocaleString('ar-SA')} ريال</span>
                        </div>
                      )}
<div>
                        <span className="text-xs text-[#6B7280] block mb-1">{selectedOffer?.supportType === 'monthly' ? 'الدعم الشهري' : 'دعم الدفعة'}</span>
                        <span className="font-bold text-[#0EA5A4]">{(selectedOffer.housingSupportAmount).toLocaleString('ar-SA')} ريال{selectedOffer?.supportType === 'monthly' ? ' / شهر' : ''}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6B7280] block mb-1">هامش الربح العقاري</span>
                        <span className="font-bold text-indigo-700">{selectedOffer.annualMargin}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Installment Phases Cards */}
              {mainFinanceType !== 'personal_only' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
                    <h4 className="font-bold text-sm text-[#111827] mb-3 border-b border-[#F1F5F9] pb-2">سداد فترة العمل المستمرة</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">القسط الشهري العقاري:</span>
                        <span className="font-bold text-emerald-600 text-sm">{(selectedOffer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">نسبة الاستقطاع المسموح (DSR):</span>
                        <span className="font-semibold">{selectedOffer.dsrUsed}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
                    <h4 className="font-bold text-sm text-[#111827] mb-3 border-b border-[#F1F5F9] pb-2">تقسيط مرحلة ما بعد التقاعد</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">القسط العقاري التقاعدي:</span>
                        <span className="font-bold text-amber-600 text-sm">{(selectedOffer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">الراتب التقاعدي للعميل:</span>
                        <span className="font-semibold">{(selectedOffer.pensionSalary).toLocaleString('ar-SA')} ريال</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis of Diagnostic Trace */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
                <h4 className="font-black text-sm text-[#111827] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0057B8]" />
                  <span>خطوات وتشخيص محرك الـ Finance Engine لـ {selectedOffer.bankName}:</span>
                </h4>

                {/* Steps workflow visual */}
                <div className="space-y-3.5 pr-2 border-r-2 border-slate-100">
                  {selectedOffer.diagnosticSteps.map((step, i) => (
                    <div key={i} className="relative flex gap-3 items-start mr-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[#6B7280] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-xs text-[#4B5563] leading-relaxed font-sans">{step}</p>
                    </div>
                  ))}
                </div>

                {/* Status messages notifications */}
                <div className="pt-2">
                  <h4 className="font-bold text-xs text-[#111827] mb-2">إشعارات التشخيص والملاءمة:</h4>
                  <div className="space-y-2">
                    {selectedOffer.diagnosticMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2 ${
                          selectedOffer.isEligible
                            ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                        } border`}
                      >
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer notes */}
              <p className="text-[10px] text-[#9CA3AF] text-center leading-relaxed font-sans">
                هذه الحسبة مبدئية وتعتمد على الموديل الرياضي لـ "حسبة". تخضع القوانين لمراجعات لائحة السياسة الائتمانية للبنوك والبنك المركزي السعودي (SAMA).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
