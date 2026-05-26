import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// الإعدادات الافتراضية (تُستخدم فقط إذا كانت قاعدة البيانات فارغة)
import { initialBanks } from '../seeds/banks';
import { initialMarginRules } from '../seeds/margin-rules';
import { initialDsrRules } from '../seeds/dsr-rules';
import { initialPersonalFinanceRules } from '../seeds/personal-finance-rules';
import { initialProductAcceptance } from '../seeds/products';
import { initialMilitaryRanks } from '../seeds/ranks';
import { initialPensionRules } from '../seeds/pension-rules';
import { initialSupportSettings } from '../seeds/support-rules';
import { initialSalaryRules } from '../seeds/salary-rules';

const DEFAULTS: Record<string, any> = {
  banks: initialBanks,
  margin_rules: initialMarginRules,
  dsr_rules: initialDsrRules,
  personal_finance_rules: initialPersonalFinanceRules,
  product_acceptance: initialProductAcceptance,
  military_ranks: initialMilitaryRanks,
  pension_rules: initialPensionRules,
  support_settings: initialSupportSettings,
  salary_rules: initialSalaryRules,
};

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // جلب كل الإعدادات من Supabase
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error || !data) {
      console.error('Failed to fetch settings:', error);
      setSettings(DEFAULTS);
      setLoading(false);
      return;
    }

    const loaded: Record<string, any> = {};
    for (const row of data) {
      // إذا كانت القيمة فارغة استخدم الافتراضي
      if (
        row.value === null ||
        (Array.isArray(row.value) && row.value.length === 0) ||
        (typeof row.value === 'object' && Object.keys(row.value).length === 0)
      ) {
        loaded[row.key] = DEFAULTS[row.key] ?? row.value;
      } else {
        loaded[row.key] = row.value;
      }
    }
    setSettings(loaded);
    setInitialized(true);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // حفظ إعداد معين في Supabase (للـ admin/manager فقط)
  const saveSetting = useCallback(async (key: string, value: any) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;

    // تحديث الـ state محلياً
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    settings,
    loading,
    initialized,
    fetchSettings,
    saveSetting,
    banks: settings.banks ?? DEFAULTS.banks,
    marginRules: settings.margin_rules ?? DEFAULTS.margin_rules,
    dsrRules: settings.dsr_rules ?? DEFAULTS.dsr_rules,
    personalRules: settings.personal_finance_rules ?? DEFAULTS.personal_finance_rules,
    products: settings.product_acceptance ?? DEFAULTS.product_acceptance,
    militaryRanks: settings.military_ranks ?? DEFAULTS.military_ranks,
    pensionRules: settings.pension_rules ?? DEFAULTS.pension_rules,
    supportSettings: settings.support_settings ?? DEFAULTS.support_settings,
    salaryRules: settings.salary_rules ?? DEFAULTS.salary_rules,
  };
}
