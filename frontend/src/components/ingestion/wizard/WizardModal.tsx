/**
 * WizardModal 6 步骤状态管理策略：
 *
 * 1. 步骤导航状态 (step)
 *    - 使用 useIngestionStore 中的 step 状态管理
 *    - next()/prev() 控制步骤切换
 *    - 跳转时不做数据验证（用户可自由导航）
 *
 * 2. 各步骤数据 (ingestionStore)
 *    - Step1-2: deviceType, connection -> 立即持久化到 store
 *    - Step3: logFormat, customRegex -> 实时保存
 *    - Step4: templateName -> 保存到 store
 *    - Step5: batchDevices, batchImportResult -> 导入成功后保存
 *    - Step6: parseTestResult -> 测试完成后保存
 *
 * 3. 数据保持策略
 *    - 用户在任意步骤关闭 Wizard，数据保留在 store 中
 *    - 用户再次打开 Wizard，从 store 恢复数据（如 isEditMode）
 *    - 用户点击"取消"或"X"时，调用 resetWizard() 清空 store
 *    - 用户点击"重新开始"时，调用 resetWizard() 清空 store
 *
 * 4. 模板 ID 传递
 *    - AI 识别后自动创建模板 -> currentTemplateId
 *    - 批量导入后 -> batchCreatedTemplateIds[]
 *    - Step6 使用 selectedTemplateIdForTest
 */

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
import { WIZARD_STEPS } from '@/types/ingestion';

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
      case 4: return true;  // Step4 有独立完成按钮，但仍允许 canGoNext
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
              <h2 className="text-base font-medium text-slate-200">{WIZARD_STEPS.find(s => s.num === step)?.label ?? ''}</h2>
            </>
          )}
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        {!isEditMode && step <= 5 && (
          <DialogFooter>
            {step > 1 && (
              <Button variant="ghost" onClick={prevStep}>
                上一步
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              取消
            </Button>
            {step === 5 ? (
              <Button variant="ghost" onClick={nextStep}>
                跳过批量导入
              </Button>
            ) : (
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
