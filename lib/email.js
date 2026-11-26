'use strict';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getEmailConfiguration() {
  const config = {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
    notificationEmail: process.env.REGISTRATION_NOTIFICATION_EMAIL || ''
  };
  if (!config.apiKey && !config.from && !config.notificationEmail) return null;
  if (!config.apiKey || !config.from || !config.notificationEmail) {
    const error = new Error('Email notification configuration is incomplete.');
    error.code = 'email_configuration_incomplete';
    throw error;
  }
  return config;
}

function inlineText(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
}

async function sendEmail(config, message) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const error = new Error(`Email delivery returned HTTP ${response.status}.`);
    error.code = `email_http_${response.status}`;
    throw error;
  }
}

async function sendRegistrationNotifications(reference, data) {
  const config = getEmailConfiguration();
  if (!config) return { status: 'not_configured', failures: [] };

  const studentName = inlineText(data.studentName);
  const parentName = inlineText(data.parentName);
  const messages = [
    {
      target: 'parent',
      to: data.parentEmail,
      subject: 'Glight received your student registration',
      text: `Hello ${parentName},\n\nGlight International Consult has received your registration enquiry for ${studentName}.\n\nYour reference is ${reference}. Please keep it for your records. A member of the Glight team will follow up using the contact details you provided.\n\nThank you,\nGlight International Consult`
    },
    {
      target: 'team',
      to: config.notificationEmail,
      subject: `New Glight student registration: ${reference}`,
      text: `A new student registration enquiry has been received.\n\nReference: ${reference}\n\nSign in to the Glight administrator dashboard to view the submitted information.`
    }
  ];

  const results = await Promise.allSettled(messages.map((message) => sendEmail(config, message)));
  const failures = results.reduce((failed, result, index) => {
    if (result.status === 'rejected') failed.push({ target: messages[index].target, error: result.reason });
    return failed;
  }, []);
  return { status: failures.length === 0 ? 'sent' : 'failed', failures };
}

module.exports = { sendRegistrationNotifications };
