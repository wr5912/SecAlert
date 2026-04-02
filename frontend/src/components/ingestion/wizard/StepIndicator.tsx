import { Check } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { WIZARD_STEPS } from '@/types/ingestion';

export function StepIndicator() {
  const { step } = useIngestionStore();

  return (
    <div className="flex items-center justify-center pb-4">
      {WIZARD_STEPS.map((s, i) => {
        const isCompleted = step > s.num;
        const isActive = step === s.num;

        return (
          <div key={s.num} className="flex items-center">
            {/* 步骤圆圈 */}
            <div
              className={`
                flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold
                transition-all duration-200 flex-shrink-0
                ${isCompleted
                  ? 'bg-accent text-background'
                  : isActive
                  ? 'bg-accent/20 border-2 border-accent text-accent'
                  : 'border-2 border-slate-600 text-slate-500'
                }
              `}
              title={s.label}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
            </div>

            {/* 连接线 */}
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={`
                  h-0.5 mx-1 flex-shrink-0 transition-all duration-200
                  ${isCompleted ? 'bg-accent' : 'bg-slate-700'}
                `}
                style={{ minWidth: '12px' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
