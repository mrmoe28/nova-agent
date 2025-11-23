#!/usr/bin/env tsx
/**
 * Monitor Vercel Deployment Status
 * Checks the latest deployment and monitors for errors
 */

import { execSync } from "child_process";

interface DeploymentInfo {
  url: string;
  status: string;
  state: string;
  created: number;
  building: boolean;
  ready: boolean;
}

async function getLatestDeployment(): Promise<DeploymentInfo | null> {
  try {
    const output = execSync("vercel ls --json", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const deployments = JSON.parse(output);
    if (deployments && deployments.length > 0) {
      return deployments[0];
    }
    return null;
  } catch (error) {
    console.error("Error getting deployments. Make sure Vercel CLI is installed:");
    console.error("npm i -g vercel");
    return null;
  }
}

async function checkDeploymentHealth(url: string): Promise<void> {
  try {
    console.log(`\n🔍 Checking deployment health: ${url}`);

    // Check homepage
    const response = await fetch(url);
    if (response.ok) {
      console.log("✅ Homepage: OK");
    } else {
      console.log(`❌ Homepage: ${response.status} ${response.statusText}`);
    }

    // Check API health
    const apiResponse = await fetch(`${url}/api/monitoring/status`);
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log("✅ API Health:", JSON.stringify(data, null, 2));
    } else {
      console.log(`⚠️  API Health: ${apiResponse.status}`);
    }
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }
}

async function main() {
  console.log("🚀 Vercel Deployment Monitor\n");

  const deployment = await getLatestDeployment();

  if (!deployment) {
    console.log("No deployments found. Have you deployed to Vercel yet?");
    console.log("\nTo deploy:");
    console.log("  vercel --prod");
    process.exit(1);
  }

  console.log("📦 Latest Deployment:");
  console.log(`   URL: https://${deployment.url}`);
  console.log(`   Status: ${deployment.state}`);
  console.log(`   Ready: ${deployment.ready ? "✅" : "⏳"}`);
  console.log(
    `   Created: ${new Date(deployment.created).toLocaleString()}`,
  );

  if (deployment.state === "ERROR") {
    console.log("\n❌ Deployment failed!");
    console.log("Check logs:");
    console.log(`  vercel logs https://${deployment.url}`);
    process.exit(1);
  }

  if (deployment.building) {
    console.log("\n⏳ Deployment is still building...");
    console.log("Check status:");
    console.log(`  vercel inspect https://${deployment.url}`);
    process.exit(0);
  }

  if (deployment.ready) {
    console.log("\n✅ Deployment is ready!");
    await checkDeploymentHealth(`https://${deployment.url}`);
  }

  // Show production URL
  console.log("\n🌐 Production URL:");
  try {
    const prodUrl = execSync("vercel --prod --url", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    console.log(`   ${prodUrl}`);
  } catch {
    console.log("   Run 'vercel --prod' to get production URL");
  }
}

main();



