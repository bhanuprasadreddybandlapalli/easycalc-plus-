import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Android packaging config", () => {
  it("Capacitor bundles the static client build", () => {
    const cfg = readFileSync("capacitor.config.ts", "utf8");
    expect(cfg).toContain('webDir: "dist-static"');
    expect(cfg).toContain('appId: "com.easycalc.plus"');
    expect(cfg).not.toContain("server:");
  });
  it("workflow builds and uploads the debug APK", () => {
    const wf = readFileSync(".github/workflows/android-apk.yml", "utf8");
    for (const s of ["build:static", "cap sync android", "assembleDebug", "app-debug.apk"])
      expect(wf).toContain(s);
  });
  it("uses Java 21 required by the installed Capacitor Android library", () => {
    const wf = readFileSync(".github/workflows/android-apk.yml", "utf8");
    const android = readFileSync("node_modules/@capacitor/android/capacitor/build.gradle", "utf8");
    expect(android).toContain("sourceCompatibility JavaVersion.VERSION_21");
    expect(android).toContain("targetCompatibility JavaVersion.VERSION_21");
    expect(wf).toContain('java-version: "21"');
  });
});