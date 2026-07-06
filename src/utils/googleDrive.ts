export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

/**
 * Searches for an existing wealth portfolio backup file in Google Drive
 */
export async function findBackupFile(accessToken: string): Promise<GoogleDriveFile | null> {
  try {
    const q = encodeURIComponent("name = 'wealth_portfolio_backup.json' and trashed = false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive Search failed: HTTP ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0] as GoogleDriveFile;
    }
    return null;
  } catch (error) {
    console.error('findBackupFile error:', error);
    throw error;
  }
}

/**
 * Saves/updates a backup file in Google Drive.
 * If fileId is passed, it overwrites the existing file.
 * Otherwise, it creates a new file first, then uploads the media.
 */
export async function saveBackupFile(
  accessToken: string,
  data: any,
  fileId?: string
): Promise<{ id: string; modifiedTime: string }> {
  try {
    let activeFileId = fileId;

    if (!activeFileId) {
      // Step 1: Create empty file metadata on Google Drive
      const createRes = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'wealth_portfolio_backup.json',
            mimeType: 'application/json'
          })
        }
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Google Drive File Creation failed: HTTP ${createRes.status} - ${errText}`);
      }

      const createData = await createRes.json();
      activeFileId = createData.id;
    }

    if (!activeFileId) {
      throw new Error('Failed to resolve target Google Drive file ID.');
    }

    // Step 2: Upload actual JSON backup contents using upload media PATCH endpoint
    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${activeFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data, null, 2)
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive Content Upload failed: HTTP ${uploadRes.status} - ${errText}`);
    }

    // Step 3: Fetch updated metadata to get accurate modified timestamp
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${activeFileId}?fields=id,name,modifiedTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!metaRes.ok) {
      return { id: activeFileId, modifiedTime: new Date().toISOString() };
    }

    const metaData = await metaRes.json();
    return {
      id: metaData.id,
      modifiedTime: metaData.modifiedTime || new Date().toISOString()
    };
  } catch (error) {
    console.error('saveBackupFile error:', error);
    throw error;
  }
}

/**
 * Downloads the JSON content of a backup file from Google Drive
 */
export async function loadBackupFile(accessToken: string, fileId: string): Promise<any> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive Download failed: HTTP ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('loadBackupFile error:', error);
    throw error;
  }
}
