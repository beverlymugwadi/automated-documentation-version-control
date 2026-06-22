'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Documentation = require('../src/models/Documentation');
const DocVersion = require('../src/models/DocVersion');
const { generateDoc } = require('../src/services/docGenerator');
const { commitVersion } = require('../src/services/versionControl');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adgvc';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Project.deleteMany({});
  await Documentation.deleteMany({});
  await DocVersion.deleteMany({});
  console.log('Cleared existing data');

  // Create a test user
  const user = await User.create({
    fullName: 'Beverly Mugwadi',
    email: 'beverlymugwadi15@gmail.com',
    password: 'password123',
  });
  console.log('Created user:', user.email);

  // Create a test project
  const project = await Project.create({
    projectName: 'ADGVC Demo Project',
    description: 'A sample project to demonstrate the documentation generator',
    userId: user._id,
  });
  console.log('Created project:', project.projectName);

  // Generate sample documentation
  const notes = `
    This module provides an overview of the ADGVC system
    npm install to set up dependencies
    GET /api/docs returns all documentation for a project
    POST /api/docs generates and saves new documentation
    throws 401 if the user is not authenticated
    Added initial documentation generation feature
  `;

  const code = `
    async function generateDoc({ title, notes, code }) {
      const structure = buildStructure({ title, notes, code });
      const markdown = renderMarkdown(structure);
      return { structure, markdown };
    }

    function buildStructure({ title, notes, code }) {
      const noteResult = processNotes(notes || '');
      const codeResult = code && code.trim() ? analyzeCode(code) : null;
      return {
        title: title || 'Untitled',
        generatedAt: new Date().toISOString(),
        noteSections: noteResult.sections,
        code: codeResult,
      };
    }
  `;

  const result = generateDoc({
    title: 'ADGVC System Documentation',
    notes,
    code,
  });

  const doc = await Documentation.create({
    projectId: project._id,
    userId: user._id,
    title: 'ADGVC System Documentation',
    content: result.markdown,
    structured: result.structure,
    currentVersion: 1,
  });

  const { commitHash } = await commitVersion(
    doc._id,
    result.markdown,
    'Initial documentation'
  );

  await DocVersion.create({
    docId: doc._id,
    userId: user._id,
    versionNumber: 1,
    content: result.markdown,
    commitHash,
    changeMessage: 'Initial documentation',
  });

  console.log('Created documentation:', doc.title);
  console.log('\nSeed complete! Login with:');
  console.log('Email:    beverlymugwadi15@gmail.com');
  console.log('Password: password123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});