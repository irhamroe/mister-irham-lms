const fs = require('fs');
const path = require('path');
const db = require('../db');

const SETTINGS_KEY = 'google_drive_config';

/**
 * Get Google Drive configuration from DB or Environment variables
 */
function getDriveSettings() {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(SETTINGS_KEY);
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return {
        webhookUrl: parsed.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
        parentFolderId: parsed.parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '',
        isConfigured: !!(parsed.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL),
        lastTested: parsed.lastTested || null
      };
    }
  } catch (err) {
    console.error('Error fetching drive settings:', err);
  }

  return {
    webhookUrl: process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
    parentFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    isConfigured: !!process.env.GOOGLE_DRIVE_WEBHOOK_URL,
    lastTested: null
  };
}

/**
 * Save Google Drive configuration into DB
 */
function saveDriveSettings({ webhookUrl, parentFolderId }) {
  const current = getDriveSettings();
  const updated = {
    webhookUrl: (webhookUrl || '').trim(),
    parentFolderId: (parentFolderId || '').trim(),
    lastTested: current.lastTested
  };

  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(SETTINGS_KEY, JSON.stringify(updated));

  return getDriveSettings();
}

/**
 * Test connection to the Google Apps Script Web App
 */
async function testDriveConnection(webhookUrlInput) {
  const settings = getDriveSettings();
  const targetUrl = (webhookUrlInput || settings.webhookUrl || '').trim();

  if (!targetUrl) {
    throw new Error('URL Google Apps Script Web App belum diisi!');
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'test',
        timestamp: new Date().toISOString()
      })
    });

    if (!res.ok) {
      throw new Error(`Google Apps Script merespons status HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success) {
      // Update lastTested timestamp
      const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(SETTINGS_KEY);
      const parsed = row ? JSON.parse(row.value) : {};
      parsed.lastTested = new Date().toISOString();
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `).run(SETTINGS_KEY, JSON.stringify(parsed));

      return {
        success: true,
        message: 'Koneksi ke Google Drive berhasil terhubung!'
      };
    } else {
      throw new Error(data.error || 'Respon Google Drive tidak valid.');
    }
  } catch (err) {
    throw new Error('Gagal menghubungi Google Apps Script: ' + err.message);
  }
}

/**
 * Sanitize folder and file names for filesystem and Drive
 */
function sanitizeName(name) {
  return (name || '').replace(/[\\/:*?"<>|]/g, '-').trim();
}

/**
 * Upload student assignment submission to Google Drive:
 * Structure: [Nama Tugas] -> [Nama Kelas] -> [Nomor Absen] - [Nama Siswa].[ext]
 */
async function uploadSubmissionFile({
  folderTask,
  folderClass,
  studentAbsen,
  studentName,
  originalFileName,
  fileBase64,
  mimeType
}) {
  const settings = getDriveSettings();

  // Extract file extension
  const ext = originalFileName && originalFileName.includes('.')
    ? path.extname(originalFileName)
    : '.pdf';

  // Format student nomor absen to 2 digits (e.g. "05", "12")
  const absenNumber = Number(studentAbsen) || 1;
  const absenFormatted = String(absenNumber).padStart(2, '0');

  // Format final file name as requested: [Nomor Absen] - [Nama Siswa].[ext]
  const cleanStudentName = sanitizeName(studentName);
  const targetFileName = `${absenFormatted} - ${cleanStudentName}${ext}`;

  const cleanFolderTask = sanitizeName(folderTask) || 'Tugas Kelas';
  const cleanFolderClass = sanitizeName(folderClass) || 'Umum';

  // Extract raw base64 data without data-URL prefix
  let rawBase64 = fileBase64 || '';
  if (rawBase64.includes(';base64,')) {
    rawBase64 = rawBase64.split(';base64,')[1];
  }

  // 1. If Google Apps Script Web App is configured, upload directly to Google Drive
  if (settings.webhookUrl && rawBase64) {
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'upload',
          parentFolderId: settings.parentFolderId || '',
          folderTask: cleanFolderTask,
          folderClass: cleanFolderClass,
          fileName: targetFileName,
          fileBase64: rawBase64,
          mimeType: mimeType || 'application/octet-stream'
        })
      });

      if (response.ok) {
        const driveRes = await response.json();
        if (driveRes && driveRes.success) {
          return {
            success: true,
            fileName: targetFileName,
            originalName: originalFileName,
            driveStatus: 'UPLOADED_DRIVE',
            fileId: driveRes.fileId,
            driveUrl: driveRes.fileUrl,
            taskFolderUrl: driveRes.taskFolderUrl,
            classFolderUrl: driveRes.classFolderUrl,
            folderTask: cleanFolderTask,
            folderClass: cleanFolderClass,
            studentAbsen: absenFormatted
          };
        }
      }
    } catch (err) {
      console.warn('Google Drive Webhook upload error, falling back to local file storage:', err.message);
    }
  }

  // 2. Fallback / Local Storage when Drive is not configured or offline
  const localUploadDir = path.join(__dirname, '..', 'uploads', 'assignments', cleanFolderTask, cleanFolderClass);
  fs.mkdirSync(localUploadDir, { recursive: true });

  const localFilePath = path.join(localUploadDir, targetFileName);
  if (rawBase64) {
    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(localFilePath, buffer);
  }

  const relativeUrl = `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}/${encodeURIComponent(cleanFolderClass)}/${encodeURIComponent(targetFileName)}`;

  return {
    success: true,
    fileName: targetFileName,
    originalName: originalFileName,
    driveStatus: settings.webhookUrl ? 'SAVED_LOCAL_RETRY' : 'LOCAL_DRIVE_SIMULATED',
    fileId: `local_${Date.now()}`,
    driveUrl: relativeUrl,
    taskFolderUrl: '#',
    classFolderUrl: '#',
    folderTask: cleanFolderTask,
    folderClass: cleanFolderClass,
    studentAbsen: absenFormatted,
    isLocal: true,
    warning: settings.webhookUrl
      ? 'Upload ke Google Drive gagal, file diamankan di penyimpanan server.'
      : 'Google Drive belum dikonfigurasi. File disimpan rapi di server lokal.'
  };
}

module.exports = {
  getDriveSettings,
  saveDriveSettings,
  testDriveConnection,
  uploadSubmissionFile
};
