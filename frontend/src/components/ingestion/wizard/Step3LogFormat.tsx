import { useState } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { LOG_FORMATS } from '@/types/ingestion';
import type { LogFormat } from '@/types/ingestion';

export function Step3LogFormat() {
  const { logFormat, setLogFormat, customRegex, setCustomRegex } = useIngestionStore();
  const [localRegex, setLocalRegex] = useState(customRegex || '');

  const handleFormatSelect = (format: LogFormat) => {
    setLogFormat(format);
  };

  const handleRegexChange = (value: string) => {
    setLocalRegex(value);
    setCustomRegex(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {LOG_FORMATS.map((format) => {
          const isSelected = logFormat === format.id;

          return (
            <button
              key={format.id}
              onClick={() => handleFormatSelect(format.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-accent bg-accent/10'
                  : 'border-slate-700 hover:border-slate-500'
                }`}
            >
              <div className={`font-medium ${isSelected ? 'text-accent' : 'text-slate-200'}`}>
                {format.id}
              </div>
              <div className="text-sm text-slate-400">{format.description}</div>
            </button>
          );
        })}
      </div>

      {logFormat === 'Custom' && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">自定义正则表达式</label>
          <textarea
            value={localRegex}
            onChange={(e) => handleRegexChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 font-mono text-sm"
            rows={4}
            placeholder="例如: ^(\d{4}-\d{2}-\d{2}).*?(ERROR|WARN).*$"
          />
        </div>
      )}
    </div>
  );
}
