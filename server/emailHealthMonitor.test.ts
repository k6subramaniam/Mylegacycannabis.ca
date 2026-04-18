import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAvailableProviders } from "./emailHealthMonitor";
import { ENV } from "./_core/env";

vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "",
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
  }
}));

describe("getAvailableProviders", () => {
  beforeEach(() => {
    // Reset all ENV and process.env values before each test
    ENV.resendApiKey = "";
    ENV.smtpHost = "";
    ENV.smtpUser = "";
    ENV.smtpPass = "";
    process.env.SENDGRID_API_KEY = "";
    process.env.MAILGUN_API_KEY = "";
    process.env.MAILGUN_DOMAIN = "";
    process.env.AWS_ACCESS_KEY_ID = "";
    process.env.AWS_SECRET_ACCESS_KEY = "";
  });

  it("should return false for all providers when no env vars are set", () => {
    const providers = getAvailableProviders();
    expect(providers.every((p) => p.configured === false)).toBe(true);
  });

  it("should configure Resend when resendApiKey is provided", () => {
    ENV.resendApiKey = "re_123456";
    const providers = getAvailableProviders();
    const resend = providers.find((p) => p.name === "resend");

    expect(resend?.configured).toBe(true);
    expect(resend?.warning).toContain("Free tier: can only send to your own email");
  });

  it("should configure SMTP when all required vars are provided", () => {
    ENV.smtpHost = "smtp.example.com";
    ENV.smtpUser = "user";
    ENV.smtpPass = "pass";
    const providers = getAvailableProviders();
    const smtp = providers.find((p) => p.name === "smtp");

    expect(smtp?.configured).toBe(true);
    expect(smtp?.warning).toContain("Railway Hobby plan blocks SMTP");
  });

  it("should not configure SMTP and show warning if pass is missing", () => {
    ENV.smtpHost = "smtp.example.com";
    ENV.smtpUser = "user";
    const providers = getAvailableProviders();
    const smtp = providers.find((p) => p.name === "smtp");

    expect(smtp?.configured).toBe(false);
    expect(smtp?.warning).toContain("SMTP_PASS is missing");
  });

  it("should configure Sendgrid when SENDGRID_API_KEY is provided", () => {
    process.env.SENDGRID_API_KEY = "sg.123";
    const providers = getAvailableProviders();
    const sendgrid = providers.find((p) => p.name === "sendgrid");

    expect(sendgrid?.configured).toBe(true);
  });

  it("should configure Mailgun when API key and domain are provided", () => {
    process.env.MAILGUN_API_KEY = "key-123";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    const providers = getAvailableProviders();
    const mailgun = providers.find((p) => p.name === "mailgun");

    expect(mailgun?.configured).toBe(true);
  });

  it("should not configure Mailgun if only API key is provided", () => {
    process.env.MAILGUN_API_KEY = "key-123";
    const providers = getAvailableProviders();
    const mailgun = providers.find((p) => p.name === "mailgun");

    expect(mailgun?.configured).toBe(false);
  });

  it("should configure SES when access key and secret are provided", () => {
    process.env.AWS_ACCESS_KEY_ID = "AKIA123";
    process.env.AWS_SECRET_ACCESS_KEY = "secret123";
    const providers = getAvailableProviders();
    const ses = providers.find((p) => p.name === "ses");

    expect(ses?.configured).toBe(true);
  });

  it("should not configure SES if secret is missing", () => {
    process.env.AWS_ACCESS_KEY_ID = "AKIA123";
    const providers = getAvailableProviders();
    const ses = providers.find((p) => p.name === "ses");

    expect(ses?.configured).toBe(false);
  });
});
