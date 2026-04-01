/**
 * 数据接入 API 客户端
 * 使用 TanStack Query 进行数据获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataSourceTemplate, ConnectionConfig, DeviceType, LogFormat, DataSourceStatus } from '../types/ingestion';

const API_BASE = '/api/ingestion';

// Types for API responses
interface TemplateListResponse {
  templates: DataSourceTemplate[];
  total: number;
}

// Fetch all templates
async function fetchTemplates(): Promise<DataSourceTemplate[]> {
  const response = await fetch(`${API_BASE}/templates`);
  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }
  const data: TemplateListResponse = await response.json();
  return data.templates;
}

// Create template
async function createTemplate(template: {
  name: string;
  device_type: DeviceType;
  connection: ConnectionConfig;
  log_format: LogFormat;
  custom_regex?: string;
}): Promise<DataSourceTemplate> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    throw new Error(`Failed to create template: ${response.statusText}`);
  }
  return response.json();
}

// Update template
async function updateTemplate(
  id: string,
  template: Partial<DataSourceTemplate>
): Promise<DataSourceTemplate> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    throw new Error(`Failed to update template: ${response.statusText}`);
  }
  return response.json();
}

// Delete template
async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }
}

// Fetch template status (DI-06)
async function fetchTemplateStatus(templateId: string): Promise<DataSourceStatus> {
  const response = await fetch(`${API_BASE}/templates/${templateId}/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template status: ${response.statusText}`);
  }
  return response.json();
}

// Hooks
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, template }: { id: string; template: Partial<DataSourceTemplate> }) =>
      updateTemplate(id, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useTemplateStatus(templateId: string) {
  return useQuery({
    queryKey: ['template-status', templateId],
    queryFn: () => fetchTemplateStatus(templateId),
    enabled: !!templateId,
    refetchInterval: 30000, // 每 30 秒刷新状态
  });
}
