import pc from "picocolors";
import type { FindingSeverity } from "../config/schema.js";

let verbose = false;
let useColor = true;

export function setVerbose(value: boolean): void {
  verbose = value;
}

export function setUseColor(value: boolean): void {
  useColor = value;
}

function c(text: string, colorFn: (s: string) => string): string {
  return useColor ? colorFn(text) : text;
}

export const logger = {
  info(message: string): void {
    console.log(c("ℹ", pc.blue), message);
  },
  success(message: string): void {
    console.log(c("✓", pc.green), message);
  },
  warn(message: string): void {
    console.warn(c("⚠", pc.yellow), message);
  },
  error(message: string): void {
    console.error(c("✗", pc.red), message);
  },
  debug(message: string): void {
    if (verbose) {
      console.log(c("·", pc.dim), pc.dim(message));
    }
  },
  heading(message: string): void {
    console.log("\n" + c(message, pc.bold));
  },
  severityColor(severity: FindingSeverity): (s: string) => string {
    switch (severity) {
      case "blocker":
        return pc.red;
      case "high":
        return pc.red;
      case "medium":
        return pc.yellow;
      case "low":
        return pc.cyan;
      case "passed":
        return pc.green;
      default:
        return pc.dim;
    }
  },
};
