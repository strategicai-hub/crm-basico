import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';

let driveClient: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) {
    throw { status: 500, message: 'GOOGLE_SERVICE_ACCOUNT_JSON não configurado' };
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    throw { status: 500, message: 'GOOGLE_SERVICE_ACCOUNT_JSON inválido (não é JSON)' };
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw { status: 500, message: 'GOOGLE_DRIVE_FOLDER_ID não configurado' };
  return id;
}

export function isDriveConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

export async function createClientFolder(clientName: string, clientId: string) {
  const drive = getDrive();
  const parent = getRootFolderId();

  const name = `${sanitize(clientName)} [${clientId.slice(0, 8)}]`;
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  const folderId = res.data.id!;
  const folderUrl = res.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
  return { folderId, folderUrl };
}

export async function deleteFile(fileId: string) {
  const drive = getDrive();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function uploadFileToFolder(params: {
  folderId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const drive = getDrive();
  const { folderId, filename, mimeType, buffer } = params;

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const fileId = res.data.id!;

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  const fresh = await drive.files.get({
    fileId,
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  return {
    fileId,
    webViewLink: fresh.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
    webContentLink: fresh.data.webContentLink ?? null,
  };
}

function sanitize(input: string) {
  return input.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'cliente';
}
