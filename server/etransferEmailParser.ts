/**
 * Enhanced Interac Autodeposit Email Parser
 *
 * Parses incoming Interac e-Transfer notification emails to extract:
 * - Sender name
 * - Amount
 * - Memo/message
 * - Reference number
 *
 * Handles all major Canadian bank notification formats (TD, RBC, BMO,
 * Scotiabank, CIBC, Desjardins, National Bank, etc.).
 */

export interface ParsedInteracEmail {
  senderName: string;
  amount: number;
  memo: string | null;
  referenceNumber: string;
  receivedAt: Date;
  rawBody: string;
}

/**
 * Parse an Interac Autodeposit notification email.
 * Typical email body contains lines like:
 *   "You've received $120.03 from MATTHEW SMITH"
 *   "Message: Order #12345"
 *   "Reference Number: CA1a2B3c4D5e"
 */
export function parseInteracEmail(
  subject: string,
  body: string,
  receivedDate: Date
): ParsedInteracEmail | null {
  // Extract amount
  // Patterns: "$120.03", "CAD 120.03", "$1,234.56"
  const amountMatch = body.match(/\$\s*([\d,]+\.\d{2})/) || subject.match(/\$\s*([\d,]+\.\d{2})/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

  // Extract sender name
  // Patterns vary by bank notification format:
  //   "from MATTHEW SMITH"
  //   "sent by Matthew Smith"
  //   "MATTHEW SMITH sent you"
  //   "deposit from Matthew Smith"
  const namePatterns = [
    /from\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})\s+(?:has been|a \u00e9t\u00e9)/i,
    /from\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})(?:\s*[.,\n]|$)/i,
    /sent\s+by\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})(?:\s*[.,\n]|$)/i,
    /([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})\s+sent\s+you/i,
    /([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})\s+has\s+sent/i,
    /deposit.*?from\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})(?:\s*[.,\n]|$)/i,
  ];

  let senderName = "Unknown";
  const combined = `${subject}\n${body}`;
  for (const pattern of namePatterns) {
    const match = combined.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Avoid matching bank/system words
      if (
        name.length > 2 &&
        !/^(interac|the|your|this|bank|from|bmo|td|rbc|cibc|scotiabank|desjardins|money|payment)$/i.test(name)
      ) {
        senderName = name;
        break;
      }
    }
  }

  // Also check subject line
  if (senderName === "Unknown") {
    const subjectMatch = subject.match(/from\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/i);
    if (subjectMatch) senderName = subjectMatch[1].trim();
  }

  // Extract memo/message
  const memoPatterns = [
    /message:\s*(.+?)(?:\n|$)/i,
    /memo:\s*(.+?)(?:\n|$)/i,
    /note:\s*(.+?)(?:\n|$)/i,
    /comment:\s*(.+?)(?:\n|$)/i,
    /included this message:\s*(.+?)(?:\n|$)/i,
    /personal message:\s*(.+?)(?:\n|$)/i,
  ];

  let memo: string | null = null;
  for (const pattern of memoPatterns) {
    const match = body.match(pattern);
    if (match && match[1].trim().length > 0) {
      memo = match[1].trim();
      break;
    }
  }

  // Extract reference number
  const refMatch = body.match(
    /reference\s*(?:number|#|no\.?)?\s*:?\s*([A-Za-z0-9]{8,20})/i
  );
  const referenceNumber = refMatch ? refMatch[1] : "";

  return {
    senderName,
    amount,
    memo,
    referenceNumber,
    receivedAt: receivedDate,
    rawBody: body,
  };
}
