import { createLogger } from "./logger";

const logger = createLogger("robots-checker");

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export class RobotsChecker {
  private cache: Map<string, { rules: RobotsRule[]; expiry: number }> =
    new Map();
  private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  async getRobotsRules(baseUrl: string): Promise<RobotsRule[]> {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;

    // Check cache first
    const cached = this.cache.get(baseUrl);
    if (cached && cached.expiry > Date.now()) {
      logger.debug({ baseUrl }, "Using cached robots.txt rules");
      return cached.rules;
    }

    try {
      const response = await fetch(robotsUrl, {
        headers: {
          "User-Agent": "NovaAgent/1.0 (+https://novaagent-kappa.vercel.app)",
        },
      });

      if (!response.ok) {
        logger.debug(
          { robotsUrl, status: response.status },
          "No robots.txt found, allowing all",
        );
        const defaultRules: RobotsRule[] = [
          {
            userAgent: "*",
            allow: ["/"],
            disallow: [],
          },
        ];
        this.cache.set(baseUrl, {
          rules: defaultRules,
          expiry: Date.now() + this.cacheTimeout,
        });
        return defaultRules;
      }

      const robotsText = await response.text();
      const rules = this.parseRobotsTxt(robotsText);

      this.cache.set(baseUrl, {
        rules,
        expiry: Date.now() + this.cacheTimeout,
      });

      logger.info(
        { baseUrl, rulesCount: rules.length },
        "Fetched robots.txt rules",
      );
      return rules;
    } catch (error) {
      logger.error({ robotsUrl, error }, "Error fetching robots.txt");
      return [
        {
          userAgent: "*",
          allow: ["/"],
          disallow: [],
        },
      ];
    }
  }

  private parseRobotsTxt(robotsText: string): RobotsRule[] {
    const lines = robotsText.split("\n").map((line) => line.trim());
    const rules: RobotsRule[] = [];
    let currentRule: Partial<RobotsRule> | null = null;

    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;

      const [directive, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();

      if (!directive || !value) continue;

      const normalizedDirective = directive.toLowerCase().trim();

      switch (normalizedDirective) {
        case "user-agent":
          if (currentRule) {
            rules.push({
              userAgent: currentRule.userAgent || "*",
              allow: currentRule.allow || [],
              disallow: currentRule.disallow || [],
              crawlDelay: currentRule.crawlDelay,
            });
          }
          currentRule = {
            userAgent: value.toLowerCase(),
            allow: [],
            disallow: [],
          };
          break;

        case "allow":
          if (currentRule) {
            if (!currentRule.allow) currentRule.allow = [];
            currentRule.allow.push(value);
          }
          break;

        case "disallow":
          if (currentRule) {
            if (!currentRule.disallow) currentRule.disallow = [];
            currentRule.disallow.push(value);
          }
          break;

        case "crawl-delay":
          if (currentRule) {
            const delay = parseInt(value);
            if (!isNaN(delay)) {
              currentRule.crawlDelay = delay * 1000; // Convert to milliseconds
            }
          }
          break;
      }
    }

    if (currentRule) {
      rules.push({
        userAgent: currentRule.userAgent || "*",
        allow: currentRule.allow || [],
        disallow: currentRule.disallow || [],
        crawlDelay: currentRule.crawlDelay,
      });
    }

    return rules;
  }

  async canCrawl(
    url: string,
    userAgent: string = "novaagent",
  ): Promise<{
    allowed: boolean;
    crawlDelay?: number;
    matchedRule?: string;
  }> {
    try {
      const parsedUrl = new URL(url);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const path = parsedUrl.pathname;

      const rules = await this.getRobotsRules(baseUrl);
      const normalizedUserAgent = userAgent.toLowerCase();

      let matchedRule: RobotsRule | null = null;

      // Find matching rule (specific user-agent or wildcard)
      for (const rule of rules) {
        if (rule.userAgent === normalizedUserAgent || rule.userAgent === "*") {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) {
        return { allowed: true };
      }

      // Check disallow rules first
      for (const disallowPattern of matchedRule.disallow) {
        if (this.pathMatches(path, disallowPattern)) {
          logger.debug(
            { url, pattern: disallowPattern },
            "URL blocked by robots.txt",
          );
          return {
            allowed: false,
            matchedRule: `Disallow: ${disallowPattern}`,
          };
        }
      }

      // Check allow rules (they can override disallow)
      for (const allowPattern of matchedRule.allow) {
        if (this.pathMatches(path, allowPattern)) {
          return {
            allowed: true,
            crawlDelay: matchedRule.crawlDelay,
          };
        }
      }

      return {
        allowed: true,
        crawlDelay: matchedRule.crawlDelay,
      };
    } catch (error) {
      logger.error({ url, error }, "Error checking robots.txt");
      return { allowed: true };
    }
  }

  private pathMatches(path: string, pattern: string): boolean {
    // Empty pattern matches nothing
    if (pattern === "") return false;

    // Exact match
    if (pattern === path) return true;

    // Wildcard matching
    if (pattern.includes("*")) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      return new RegExp(`^${regexPattern}`).test(path);
    }

    // Prefix match
    return path.startsWith(pattern);
  }
}

export const robotsChecker = new RobotsChecker();
