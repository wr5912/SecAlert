import { Firewall, Network, Key, Server, Globe, Shield, MoreHorizontal } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { DEVICE_TYPES } from '@/types/ingestion';
import type { DeviceType } from '@/types/ingestion';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Firewall, Network, Key, Server, Globe, Shield, MoreHorizontal
};

export function Step1DeviceType() {
  const { deviceType, setDeviceType } = useIngestionStore();

  return (
    <div className="grid grid-cols-3 gap-4">
      {DEVICE_TYPES.map((type) => {
        const Icon = iconMap[type.icon] || MoreHorizontal;
        const isSelected = deviceType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => setDeviceType(type.id as DeviceType)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
              ${isSelected
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-slate-700 hover:border-slate-500 text-slate-400'
              }`}
          >
            <Icon className="w-10 h-10 mb-2" />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
