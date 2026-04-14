import { describe, it, expect } from 'vitest';
import { extractAmount, extractSenderName, extractMemo, extractOrderNumber, fuzzyNameMatch } from '../../etransferService';

describe('e-Transfer Parsing Logic', () => {
  describe('extractAmount', () => {
    it('extracts standard dollar amount', () => {
      expect(extractAmount('Interac e-Transfer: $120.05', 'You have received $120.05')).toBe(120.05);
    });

    it('handles commas in amounts', () => {
      expect(extractAmount('Interac e-Transfer: $1,200.50', 'You have received $1,200.50')).toBe(1200.5);
    });

    it('extracts CAD amounts', () => {
      expect(extractAmount('Interac e-Transfer: 120.05 (CAD)', 'You have received 120.05 (CAD)')).toBe(120.05);
    });

    it('extracts amount without dollar sign', () => {
      expect(extractAmount('Amount: 15.50', 'Please accept 15.50')).toBe(15.5);
    });

    it('returns null if no amount found', () => {
      expect(extractAmount('Interac e-Transfer', 'You have received money')).toBe(null);
    });
  });

  describe('extractSenderName', () => {
    it('extracts name from standard subject', () => {
      expect(extractSenderName('Interac e-Transfer: John Doe sent you money', '', '')).toBe('John Doe');
    });

    it('extracts name from virement interac subject', () => {
      expect(extractSenderName('Virement Interac : Jane Smith vous a envoyé de l\'argent', '', '')).toBe('Jane Smith');
    });

    it('extracts name from body using "sent you"', () => {
      expect(extractSenderName('Interac e-Transfer', 'Mike Johnson sent you $10.00', '')).toBe('Mike Johnson');
    });

    it('extracts from email fallback', () => {
      expect(extractSenderName('Interac e-Transfer', 'Body', 'bob.builder@gmail.com')).toBe('Bob Builder');
    });
  });

  describe('extractMemo', () => {
    it('extracts standard message', () => {
      expect(extractMemo('Message: Thanks for the stuff')).toBe('Thanks for the stuff');
    });

    it('extracts alternative message format', () => {
      expect(extractMemo('Message : Payment for order 123')).toBe('Payment for order 123');
    });

    it('extracts multi-line message', () => {
      expect(extractMemo('Message:\nOrder 456\nThanks')).toBe('Order 456 Thanks');
    });

    it('returns null if no memo found', () => {
      expect(extractMemo('Just some text')).toBe("");
    });
  });

  describe('extractOrderNumber', () => {
    it('extracts order with pound sign', () => {
      expect(extractOrderNumber('Payment for #1234')).toBe(1234);
    });

    it('extracts order with "order"', () => {
      expect(extractOrderNumber('order 5678')).toBe(5678);
    });

    it('extracts order with "ord"', () => {
      expect(extractOrderNumber('ord9012')).toBe(9012);
    });

    it('returns null if no order number found', () => {
      expect(extractOrderNumber('Payment for stuff')).toBe(null);
    });
  });

  describe('fuzzyNameMatch', () => {
    it('matches exact same name', () => {
      expect(fuzzyNameMatch('John Doe', 'John Doe')).toBe(true);
    });

    it('matches ignoring case', () => {
      expect(fuzzyNameMatch('john doe', 'JOHN DOE')).toBe(true);
    });

    it('matches reversed names', () => {
      expect(fuzzyNameMatch('Doe, John', 'John Doe')).toBe(true);
    });

    it('matches typos (Levenshtein distance 1)', () => {
      expect(fuzzyNameMatch('Jon Doe', 'John Doe')).toBe(true);
    });

    it('matches nicknames', () => {
      expect(fuzzyNameMatch('Matt', 'Matthew')).toBe(true);
      expect(fuzzyNameMatch('Rob', 'Robert')).toBe(true);
      expect(fuzzyNameMatch('Chris', 'Christopher')).toBe(true);
    });

    it('matches same last name (spouse/family)', () => {
      expect(fuzzyNameMatch('Jane Smith', 'John Smith')).toBe(true);
    });

    it('does not match completely different names', () => {
      expect(fuzzyNameMatch('Alice Jones', 'Bob Smith')).toBe(false);
    });

    it('does not match same first name only if common', () => {
      expect(fuzzyNameMatch('John Smith', 'John Jones')).toBe(false);
    });
  });
});
