/**
 * OpenSolar API Integration Service
 * Connects NovaAgent projects with OpenSolar for advanced solar design
 */

import { logger } from '@/lib/logger';

// OpenSolar API Configuration
const OPENSOLAR_API_URL = process.env.OPENSOLAR_API_URL || 'https://api.opensolar.com/v1';
const OPENSOLAR_API_KEY = process.env.OPENSOLAR_API_KEY || '';
const OPENSOLAR_ORG_ID = process.env.OPENSOLAR_ORG_ID || '';

export interface OpenSolarProject {
  id: string;
  name: string;
  status: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  system?: {
    sizeKw: number;
    panelCount: number;
    inverterType: string;
    batteryKwh?: number;
  };
  design?: {
    designUrl: string;
    layoutUrl?: string;
    shadingReportUrl?: string;
  };
  proposal?: {
    proposalUrl: string;
    totalCost: number;
    estimatedProduction: number;
  };
}

export interface OpenSolarExportData {
  projectName: string;
  clientName: string;
  address: string;
  systemSizeKw?: number;
  panelCount?: number;
  inverterSizeKw?: number;
  batteryKwh?: number;
  notes?: string;
}

class OpenSolarService {
  private apiKey: string;
  private orgId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = OPENSOLAR_API_KEY;
    this.orgId = OPENSOLAR_ORG_ID;
    this.baseUrl = OPENSOLAR_API_URL;

    if (!this.apiKey) {
      logger.warn('OpenSolar API key not configured - integration disabled');
    }
  }

  /**
   * Check if OpenSolar integration is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.orgId);
  }

  /**
   * Make authenticated request to OpenSolar API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('OpenSolar API not configured. Please add OPENSOLAR_API_KEY and OPENSOLAR_ORG_ID to your environment variables.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Organization-Id': this.orgId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenSolar API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint,
      }, 'OpenSolar API request failed');
      throw error;
    }
  }

  /**
   * Export project to OpenSolar
   */
  async exportProject(data: OpenSolarExportData): Promise<OpenSolarProject> {
    logger.info({ projectName: data.projectName }, 'Exporting project to OpenSolar');

    const payload = {
      name: data.projectName,
      client_name: data.clientName,
      address: data.address,
      system: {
        size_kw: data.systemSizeKw,
        panel_count: data.panelCount,
        inverter_size_kw: data.inverterSizeKw,
        battery_kwh: data.batteryKwh,
      },
      notes: data.notes,
    };

    const result = await this.request<OpenSolarProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    logger.info({
      novaProjectName: data.projectName,
      openSolarProjectId: result.id,
    }, 'Successfully exported project to OpenSolar');

    return result;
  }

  /**
   * Get project from OpenSolar
   */
  async getProject(projectId: string): Promise<OpenSolarProject> {
    logger.info({ projectId }, 'Fetching project from OpenSolar');

    return await this.request<OpenSolarProject>(`/projects/${projectId}`);
  }

  /**
   * List all OpenSolar projects
   */
  async listProjects(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ projects: OpenSolarProject[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return await this.request<{ projects: OpenSolarProject[]; total: number }>(
      `/projects${queryString}`
    );
  }

  /**
   * Update project in OpenSolar
   */
  async updateProject(
    projectId: string,
    updates: Partial<OpenSolarExportData>
  ): Promise<OpenSolarProject> {
    logger.info({ projectId }, 'Updating project in OpenSolar');

    return await this.request<OpenSolarProject>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete project from OpenSolar
   */
  async deleteProject(projectId: string): Promise<void> {
    logger.info({ projectId }, 'Deleting project from OpenSolar');

    await this.request<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get design files from OpenSolar project
   */
  async getDesignFiles(projectId: string): Promise<{
    layout?: string;
    shadingReport?: string;
    proposal?: string;
  }> {
    const project = await this.getProject(projectId);

    return {
      layout: project.design?.layoutUrl,
      shadingReport: project.design?.shadingReportUrl,
      proposal: project.proposal?.proposalUrl,
    };
  }

  /**
   * Import system data from OpenSolar back to NovaAgent
   */
  async importSystemData(projectId: string): Promise<{
    systemSizeKw?: number;
    panelCount?: number;
    estimatedProduction?: number;
    totalCost?: number;
    designUrl?: string;
  }> {
    logger.info({ projectId }, 'Importing system data from OpenSolar');

    const project = await this.getProject(projectId);

    return {
      systemSizeKw: project.system?.sizeKw,
      panelCount: project.system?.panelCount,
      estimatedProduction: project.proposal?.estimatedProduction,
      totalCost: project.proposal?.totalCost,
      designUrl: project.design?.designUrl,
    };
  }

  /**
   * Generate OpenSolar design URL for direct access
   */
  getDesignUrl(projectId: string): string {
    return `https://opensolar.com/projects/${projectId}/design`;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    organizationName?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'OpenSolar API not configured',
        };
      }

      // Try to fetch organization info
      const response = await this.request<{ name: string }>('/organization');

      return {
        success: true,
        message: 'Successfully connected to OpenSolar',
        organizationName: response.name,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export const openSolarService = new OpenSolarService();
