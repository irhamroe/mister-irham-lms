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
 * Structure: [Nama Tugas] -> [Nama Kelas] -> [Nomor Absen]_ [Nama Siswa].[ext]
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

  // Format final file name as requested: nomor absen_ nama siswa.[ext]
  const cleanStudentName = sanitizeName(studentName);
  const targetFileName = `${absenFormatted}_ ${cleanStudentName}${ext}`;

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

/**
 * Automatically create Task Folder and Class Subfolder(s) in Google Drive & Local Storage
 * Triggered as soon as an admin or teacher creates an assignment and selects class(es)
 */
async function createTaskAndClassFolders({ folderTask, folderClass, folderClasses, existingTaskFolderUrl }) {
  const settings = getDriveSettings();
  const cleanFolderTask = sanitizeName(folderTask) || 'Tugas Kelas';

  // Normalize list of classes
  let classesList = [];
  if (Array.isArray(folderClasses) && folderClasses.length > 0) {
    classesList = folderClasses.map(c => sanitizeName(c)).filter(Boolean);
  } else if (folderClass) {
    classesList = [sanitizeName(folderClass)];
  }
  if (classesList.length === 0) {
    classesList = ['Semua Kelas'];
  }

  const primaryClass = classesList[0];

  // 1. If Google Apps Script Web App is configured, create folders in Google Drive
  if (settings.webhookUrl) {
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'create_folders',
          parentFolderId: settings.parentFolderId || '',
          folderTask: cleanFolderTask,
          folderClass: primaryClass,
          folderClasses: classesList
        })
      });

      if (response.ok) {
        const driveRes = await response.json();
        if (driveRes && driveRes.success) {
          const classFoldersMap = driveRes.classFolders || {};
          // Ensure primaryClass has mapping if single class was processed
          if (!classFoldersMap[primaryClass] && driveRes.classFolderUrl) {
            classFoldersMap[primaryClass] = {
              id: driveRes.classFolderId,
              url: driveRes.classFolderUrl
            };
          }

          // Also ensure local mirror directories exist for all selected classes
          for (const cName of classesList) {
            const localClassDir = path.join(__dirname, '..', 'uploads', 'assignments', cleanFolderTask, cName);
            fs.mkdirSync(localClassDir, { recursive: true });
          }

          return {
            success: true,
            taskFolderId: driveRes.taskFolderId,
            taskFolderUrl: existingTaskFolderUrl || driveRes.taskFolderUrl,
            classFolderId: driveRes.classFolderId,
            classFolderUrl: driveRes.classFolderUrl,
            classFolders: classFoldersMap,
            folderTask: cleanFolderTask,
            folderClasses: classesList,
            mode: 'GOOGLE_DRIVE'
          };
        }
      }
    } catch (err) {
      console.warn('Google Drive create folders failed, creating local folder structure:', err.message);
    }
  }

  // 2. Local filesystem creation fallback (and offline safety)
  const classFoldersMap = {};
  for (const cName of classesList) {
    const localClassDir = path.join(__dirname, '..', 'uploads', 'assignments', cleanFolderTask, cName);
    fs.mkdirSync(localClassDir, { recursive: true });
    const relativeUrl = `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}/${encodeURIComponent(cName)}`;
    classFoldersMap[cName] = {
      id: `local_class_${cName}_${Date.now()}`,
      url: relativeUrl
    };
  }

  const primaryUrl = classFoldersMap[primaryClass]?.url || `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}/${encodeURIComponent(primaryClass)}`;

  return {
    success: true,
    taskFolderId: `local_task_${Date.now()}`,
    taskFolderUrl: existingTaskFolderUrl || `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}`,
    classFolderId: `local_class_${Date.now()}`,
    classFolderUrl: primaryUrl,
    classFolders: classFoldersMap,
    folderTask: cleanFolderTask,
    folderClasses: classesList,
    mode: 'LOCAL',
    warning: settings.webhookUrl
      ? 'Google Drive tidak merespons, folder dibuat di server lokal.'
      : 'Google Drive belum dikonfigurasi, folder dibuat di server lokal.'
  };
}

module.exports = {
  getDriveSettings,
  saveDriveSettings,
  testDriveConnection,
  uploadSubmissionFile,
  createTaskAndClassFolders,
  sanitizeName
};
