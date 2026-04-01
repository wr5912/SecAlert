import { Check } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { WIZARD_STEPS } from '@/types/ingestion';

export function StepIndicator() {
  const { step } = useIngestionStore();

  return (
    <div className="flex items-center justify-center gap-2 pb-4">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
              ${step > s.num
                ? 'bg-accent border-accent text-background'  // 已完成
                : step === s.num
                ? 'bg-accent/20 border-accent text-accent'  // 当前
                : 'border-slate-600 text-slate-500'         // 未完成
              }`}
          >
            {step > s.num ? <Check className="w-4 h-4" /> : s.num}
          </div>
          <span className={`ml-2 text-sm ${
            step >= s.num ? 'text-accent' : 'text-slate-500'
          }`}>
            {s.label}
          </span>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${
              step > s.num ? 'bg-accent' : 'bg-slate-600'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
