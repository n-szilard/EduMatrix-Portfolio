require('dotenv').config();
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Email sablon renderelése
const renderEmailTemplate = async (templateName, data) => {
  const templatePath = path.join(__dirname, '../mail-views', `${templateName}.ejs`);
  try {
    const html = await ejs.renderFile(templatePath, data);
    return html;
  } catch (error) {
    console.error('Email template render hiba:', error);
    throw error;
  }
};

// Email küldés
const sendEmail = async (to, subject, templateName, data) => {
  try {
    const html = await renderEmailTemplate(templateName, data);
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email elküldve:', info.response);
    return info;
  } catch (error) {
    console.error('Email küldési hiba:', error);
    throw error;
  }
};

module.exports = { sendEmail, transporter };
