import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIngestionStore } from '@/stores/ingestionStore';
import { StepIndicator } from './StepIndicator';
import { Step1DeviceType } from './Step1DeviceType';
import { Step2Connection } from './Step2Connection';
import { Step3LogFormat } from './Step3LogFormat';
import { Step4Complete } from './Step4Complete';
import { Step5BatchImport } from './Step5BatchImport';
import { Step6ParseTest } from './Step6ParseTest';

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepTitles: Record<number, string> = {
  1: '选择设备类型',
  2: '配置连接参数',
  3: '选择日志格式',
  4: '模板设置',
  5: '批量导入',
  6: '完成',
};

const editModeTitle = '编辑模板';

export function WizardModal({ open, onOpenChange }: WizardModalProps) {
  const { step, deviceType, connection, logFormat, nextStep, prevStep, resetWizard, isEditMode } = useIngestionStore();

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const canGoNext = () => {
    switch (step) {
      case 1: return !!deviceType;
      case 2: return !!connection;
      case 3: return !!logFormat;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1DeviceType />;
      case 2: return <Step2Connection />;
      case 3: return <Step3LogFormat />;
      case 4: return <Step4Complete onFinish={handleClose} />;
      case 5: return <Step5BatchImport />;
      case 6: return <Step6ParseTest onFinish={handleClose} />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {isEditMode ? (
            <h2 className="text-base font-medium text-accent">{editModeTitle}</h2>
          ) : (
            <>
              <StepIndicator />
              <h2 className="text-base font-medium text-slate-200">{stepTitles[step]}</h2>
            </>
          )}
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        {!isEditMode && step < 5 && (
          <DialogFooter>
            {step > 1 && (
              <Button variant="ghost" onClick={prevStep}>
                上一步
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              取消
            </Button>
            {step < 5 && (
              <Button onClick={nextStep} disabled={!canGoNext()}>
                下一步
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
