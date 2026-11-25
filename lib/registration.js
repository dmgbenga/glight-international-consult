'use strict';

const crypto = require('node:crypto');

const PROGRAMMES = [
  'Coding and Programming',
  'Robotics and Automation',
  'STEM Education',
  'Scratch Programming',
  'MIT App Inventor',
  'Arduino and Electronics',
  'Python Programming',
  'HTML, CSS and JavaScript',
  'Web and App Development',
  'Digital Skills and Productivity Training',
  'AI and Technology Workshops'
];

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasControlCharacters(value) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function validateRegistration(payload) {
  const data = {
    parentName: cleanString(payload.parentName),
    parentEmail: cleanString(payload.parentEmail).toLowerCase(),
    parentPhone: cleanString(payload.parentPhone),
    studentName: cleanString(payload.studentName),
    age: payload.age,
    className: cleanString(payload.className),
    programme: cleanString(payload.programme),
    learningMode: cleanString(payload.learningMode),
    guardianConsent: payload.guardianConsent === true,
    website: cleanString(payload.website)
  };
  const fields = {};

  const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
  if (data.parentName.length < 2 || data.parentName.length > 100 || !namePattern.test(data.parentName)) {
    fields.parentName = 'Enter a valid parent or guardian name.';
  }
  if (data.parentEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentEmail)) {
    fields.parentEmail = 'Enter a valid email address.';
  }
  const phoneDigits = data.parentPhone.replace(/\D/g, '');
  if (data.parentPhone.length > 25 || !/^[+()\d\s.-]+$/.test(data.parentPhone) || phoneDigits.length < 7 || phoneDigits.length > 20) {
    fields.parentPhone = 'Enter a valid phone number.';
  }
  if (data.studentName.length < 2 || data.studentName.length > 100 || !namePattern.test(data.studentName)) {
    fields.studentName = 'Enter a valid student name.';
  }
  if (!Number.isInteger(data.age) || data.age < 3 || data.age > 18) {
    fields.age = 'Student age must be between 3 and 18.';
  }
  if (data.className.length < 1 || data.className.length > 60 || hasControlCharacters(data.className)) {
    fields.className = 'Enter a valid class or year group.';
  }
  if (!PROGRAMMES.includes(data.programme)) fields.programme = 'Select one of the listed programmes.';
  if (!['physical', 'online'].includes(data.learningMode)) fields.learningMode = 'Select a learning option.';
  if (!data.guardianConsent) fields.guardianConsent = 'Parent or guardian consent is required.';
  if (data.website.length > 0) fields.website = 'This request could not be accepted.';

  return {
    valid: Object.keys(fields).length === 0,
    fields,
    data
  };
}

function createRegistrationReference(now, randomBytes) {
  const date = now instanceof Date ? now : new Date();
  const bytes = randomBytes || crypto.randomBytes(6);
  const year = date.getUTCFullYear();
  return `GL-${year}-${bytes.toString('hex').toUpperCase()}`;
}

function createRateLimitKey(ipAddress, secret) {
  if (typeof ipAddress !== 'string' || ipAddress.length === 0 || ipAddress.length > 100) {
    throw new Error('A valid client IP address is required for rate limiting.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters.');
  }
  return crypto.createHmac('sha256', secret).update(ipAddress).digest('hex');
}

module.exports = {
  PROGRAMMES,
  validateRegistration,
  createRegistrationReference,
  createRateLimitKey
};
