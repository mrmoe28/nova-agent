/**
 * Dynamic page configuration system
 * Allows easy customization of page layouts, colors, and content
 */

export interface PageTheme {
  leftPanel: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
  rightPanel: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
}

export interface PageConfig {
  theme: PageTheme;
  layout: {
    fullWidth: boolean;
    minHeight: string;
    gap: string;
  };
  content: {
    showBadge: boolean;
    showStats: boolean;
    showQuickStart: boolean;
  };
}

export const defaultPageConfig: PageConfig = {
  theme: {
    leftPanel: {
      backgroundColor: "from-orange-50 via-white to-orange-50",
      textColor: "text-slate-900",
      accentColor: "text-orange-600",
    },
    rightPanel: {
      backgroundColor: "bg-white",
      textColor: "text-slate-900",
      accentColor: "text-orange-600",
    },
  },
  layout: {
    fullWidth: true,
    minHeight: "min-h-screen",
    gap: "gap-0",
  },
  content: {
    showBadge: true,
    showStats: true,
    showQuickStart: true,
  },
};

export const darkRightPanelConfig: PageConfig = {
  ...defaultPageConfig,
  theme: {
    ...defaultPageConfig.theme,
    rightPanel: {
      backgroundColor: "bg-white",
      textColor: "text-slate-900",
      accentColor: "text-orange-600",
    },
  },
};

// Export a function to get page config (can be extended to fetch from API/database)
export function getPageConfig(pageId: string = "default"): PageConfig {
  const configs: Record<string, PageConfig> = {
    default: defaultPageConfig,
    dark: darkRightPanelConfig,
  };
  
  return configs[pageId] || defaultPageConfig;
}
