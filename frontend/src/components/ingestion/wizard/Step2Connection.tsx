import { useState } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';

export function Step2Connection() {
  const { connection, setConnection, templateName, setTemplateName } = useIngestionStore();

  const [form, setForm] = useState({
    host: connection?.host || '',
    port: connection?.port || 22,
    username: connection?.username || '',
    password: connection?.password || '',
    protocol: connection?.protocol || 'ssh',
    name: templateName || '',
  });

  const handleSubmit = () => {
    setTemplateName(form.name);
    setConnection({
      host: form.host,
      port: form.port,
      username: form.username,
      password: form.password,
      protocol: form.protocol,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">模板名称</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          placeholder="例如：生产环境防火墙"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">主机地址</label>
        <input
          type="text"
          value={form.host}
          onChange={(e) => setForm({ ...form, host: e.target.value })}
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
            onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">协议</label>
          <select
            value={form.protocol}
            onChange={(e) => setForm({ ...form, protocol: e.target.value })}
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
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">密码</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200"
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="hidden" // 隐式提交，不显示按钮
      />
    </div>
  );
}
