import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KeyManager } from "../src/core/keys/manager.js";

describe("KeyManager env fallback", () => {
  const km = new KeyManager();
  const ENV = "APEX_OPENAI_API_KEY";
  let prev: string | undefined;

  beforeEach(() => { prev = process.env[ENV]; });
  afterEach(() => { if (prev === undefined) delete process.env[ENV]; else process.env[ENV] = prev; });

  it("returns env value when set", async () => {
    process.env[ENV] = "sk-test-123";
    expect(await km.get("openai")).toBe("sk-test-123");
  });

  it("envVarName is APEX_-prefixed", () => {
    expect(km.envVarName("openai")).toBe("APEX_OPENAI_API_KEY");
    expect(km.envVarName("radar_portal")).toBe("APEX_RADAR_PORTAL_TOKEN");
  });
});
