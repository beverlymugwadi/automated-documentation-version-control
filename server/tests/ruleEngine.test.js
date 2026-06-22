'use strict';

const { processNotes } = require('../src/services/ruleEngine');

describe('Rule Engine', () => {
  test('returns empty sections for empty input', () => {
    const result = processNotes('');
    expect(result.sections).toHaveLength(0);
    expect(result.stats.totalLines).toBe(0);
  });

  test('categorises an overview line correctly', () => {
    const result = processNotes('This module provides an overview of the system');
    const section = result.sections.find((s) => s.id === 'overview');
    expect(section).toBeDefined();
    expect(section.lines).toHaveLength(1);
  });

  test('categorises an installation line correctly', () => {
    const result = processNotes('npm install express mongoose');
    const section = result.sections.find((s) => s.id === 'installation');
    expect(section).toBeDefined();
  });

  test('categorises an API line correctly', () => {
    const result = processNotes('GET /api/users returns a list of users');
    const section = result.sections.find((s) => s.id === 'api');
    expect(section).toBeDefined();
  });

  test('categorises an error line correctly', () => {
    const result = processNotes('throws an error if the email is invalid');
    const section = result.sections.find((s) => s.id === 'errors');
    expect(section).toBeDefined();
  });

  test('handles multiple lines across different sections', () => {
    const notes = `
      This is an overview of the project
      npm install to get started
      GET /api/projects returns all projects
      throws 404 if project not found
    `;
    const result = processNotes(notes);
    expect(result.stats.totalLines).toBe(4);
    expect(result.stats.sectionCount).toBeGreaterThanOrEqual(2);
  });

  test('sections are sorted in logical order', () => {
    const notes = `
      throws an error if token is missing
      npm install dependencies first
      This project manages documentation
    `;
    const result = processNotes(notes);
    const orders = result.sections.map((s) => s.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});