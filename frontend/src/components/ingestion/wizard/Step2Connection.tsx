import { useEffect } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';

export function Step2Connection() {
  const { connection, setConnection, templateName, setTemplateName } = useIngestionStore();

  // 本地表单状态
  const [form, setForm] = useState({
    host: '',
    port: 22,
    username: '',
    password: '',
    protocol: 'ssh',
    name: '',
  });

  // 初始化时从 store 加载数据
  useEffect(() => {
    if (connection) {
      setForm({
        host: connection.host || '',
        port: connection.port || 22,
        username: connection.username || '',
        password: connection.password || '',
        protocol: connection.protocol || 'ssh',
        name: templateName || '',
      });
    }
  }, []);

  // 自动同步到 store（当用户输入变化时）
  const updateField = (field: string, value: string | number) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    // 实时同步到 store
    setConnection({
      host: newForm.host,
      port: newForm.port,
      username: newForm.username,
      password: newForm.password,
      protocol: newForm.protocol,
    });
    setTemplateName(newForm.name);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">模板名称</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          placeholder="例如：生产环境防火墙"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">主机地址</label>
        <input
          type="text"
          value={form.host}
          onChange={(e) => updateField('host', e.target.value)}
          className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          placeholder="192.168.1.1 或 hostname"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">端口</label>
          <input
            type="number"
            value={form.port}
            onChange={(e) => updateField('port', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">协议</label>
          <select
            value={form.protocol}
            onChange={(e) => updateField('protocol', e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          >
            <option value="ssh">SSH</option>
            <option value="snmp">SNMP</option>
            <option value="http">HTTP</option>
            <option value="jdbc">JDBC</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">用户名</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">密码</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
      </div>
    </div>
  );
}
