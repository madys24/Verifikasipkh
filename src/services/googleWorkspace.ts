import { PKHRecord } from '../types';

// Encodes sheet data into PKHRecord format
const parseRowToRecord = (row: any[], index: number): PKHRecord => {
  return {
    id: row[0] || `PKH-MOCK-${index}`,
    tanggal: row[1] || '',
    namaKpm: row[2] || '',
    nikKpm: row[3] || '',
    kategori: (row[4] === 'Anak Balita' ? 'Balita' : (row[4] || 'Balita')) as any,
    namaSasaran: row[5] || '',
    usia: Number(row[6]) || 0,
    beratBadan: Number(row[7]) || 0,
    tinggiBadan: Number(row[8]) || 0,
    imunisasiKia: (row[9] === 'Ya' ? 'Ya' : 'Tidak') as any,
    vitaminSuplemen: (row[10] === 'Ya' ? 'Ya' : 'Tidak') as any,
    namaFaskes: row[11] || '',
    keterangan: row[12] || '',
    linkFoto: row[13] || '',
    idFotoDrive: row[14] || '',
    emailPelapor: row[15] || '',
    triwulan: row[16] || '',
    bulanPelaporan: row[17] || '',
    linkFotoFormulir: row[18] || '',
    idFotoFormulirDrive: row[19] || '',
    tanggalCatatan: row[20] || '',
  };
};

const HEADERS = [
  'ID',
  'Tanggal',
  'Nama KPM',
  'NIK KPM',
  'Kategori',
  'Nama Sasaran',
  'Usia (Bulan/Hamil)',
  'Berat Badan (kg)',
  'Tinggi Badan (cm)',
  'Imunisasi/Pemeriksaan',
  'Vitamin A/Suplemen',
  'Nama Faskes',
  'Keterangan',
  'Link Foto',
  'ID Foto Drive',
  'Email Pelapor',
  'Triwulan',
  'Bulan Pelaporan',
  'Link Foto Formulir',
  'ID Foto Formulir Drive',
  'Tanggal Catatan'
];

const SEED_DATA = [
  [
    'PKH-001',
    '2026-06-19 09:30:15',
    'Siti Aminah',
    '3201234567890001',
    'Ibu Hamil',
    'Pemeriksaan Ibu Hamil',
    '4',
    '56',
    '158',
    'Ya',
    'Ya',
    'Puskesmas Sukajaya',
    'Pemeriksaan rutin trimester 2, tekanan darah normal.',
    '',
    '',
    'petugas.sukajaya@gmail.com'
  ],
  [
    'PKH-002',
    '2026-06-19 10:15:22',
    'Aminah Hasanah',
    '3201234567890002',
    'Anak Balita',
    'Ahmad Fikri',
    '12',
    '9.2',
    '74',
    'Ya',
    'Ya',
    'Posyandu Mawar',
    'Berat badan naik 300g, imunisasi campak lengkap.',
    '',
    '',
    'petugas.sukajaya@gmail.com'
  ],
  [
    'PKH-003',
    '2026-06-20 08:05:44',
    'Dewi Sartika',
    '3201234567890003',
    'Anak Balita',
    'Lani Safitri',
    '18',
    '10.5',
    '80',
    'Ya',
    'Ya',
    'Posyandu Mawar',
    'Anak sangat aktif, tumbuh kembang sesuai grafik tinggi badan buku KIA.',
    '',
    '',
    'petugas.sukajaya@gmail.com'
  ],
  [
    'PKH-004',
    '2026-06-20 09:40:00',
    'Rina Marlina',
    '3201234567890004',
    'Ibu Hamil',
    'Pemeriksaan Ibu Hamil',
    '7',
    '64',
    '160',
    'Ya',
    'Ya',
    'Puskesmas Sukajaya',
    'Sudah suntik tetanus kedua, diresepkan tablet tambah darah extra.',
    '',
    '',
    'petugas.sukajaya@gmail.com'
  ],
  [
    'PKH-005',
    '2026-06-21 08:30:10',
    'Fitri Handayani',
    '3201234567890005',
    'Anak Balita',
    'Budi Setiawan',
    '8',
    '7.8',
    '68',
    'Tidak',
    'Ya',
    'Posyandu Melati',
    'Imunisasi bulan ini ditunda karena batuk & pilek ringan, dijadwalkan ulang minggu depan.',
    '',
    '',
    'petugas.melati@gmail.com'
  ]
];

// Helper to look for file on Google Drive
export const searchDriveFile = async (
  accessToken: string,
  fileName: string,
  mimeType: string
): Promise<string | null> => {
  try {
    const q = `name = '${fileName}' and mimeType = '${mimeType}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal mencari file: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error searching drive file:', error);
    return null;
  }
};

// 1. Find or create PKH Kesehatan Database spreadsheet
export const findOrCreateSpreadsheet = async (accessToken: string): Promise<string> => {
  const fileName = 'PKH_Kesehatan_Database';
  const spreadsheetMime = 'application/vnd.google-apps.spreadsheet';
  
  // Search if it already exists
  const existingId = await searchDriveFile(accessToken, fileName, spreadsheetMime);
  if (existingId) {
    console.log('Database spreadsheet ditemukan:', existingId);
    return existingId;
  }

  // If not found, create a new one
  console.log('Database spreadsheet tidak ditemukan. Membuat spreadsheet baru...');
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: fileName,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal membuat spreadsheet: ${res.statusText}`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;

    // Initialize with headers and seed data
    await writeHeadersAndSeed(accessToken, spreadsheetId);
    return spreadsheetId;
  } catch (error) {
    console.error('Gagal membuat spreadsheet:', error);
    throw error;
  }
};

// Writes headers and initial seed data rows
const writeHeadersAndSeed = async (accessToken: string, spreadsheetId: string) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [HEADERS, ...SEED_DATA],
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal mengisi data inisialisasi: ${res.statusText}`);
    }
    console.log('Header dan data awal berhasil ditulis ke spreadsheet.');
  } catch (error) {
    console.error('Error writing headers and seed data:', error);
  }
};

// 2. Find or create the PKH_Foto_Bukti folder in Google Drive
export const findOrCreateFolder = async (accessToken: string): Promise<string> => {
  const folderName = 'PKH_Foto_Bukti';
  const folderMime = 'application/vnd.google-apps.folder';

  const existingId = await searchDriveFile(accessToken, folderName, folderMime);
  if (existingId) {
    console.log('Folder foto bukti ditemukan:', existingId);
    return existingId;
  }

  console.log('Folder foto bukti tidak ditemukan. Membuat folder baru...');
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: folderMime,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal membuat folder: ${res.statusText}`);
    }

    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error('Gagal membuat folder:', error);
    throw error;
  }
};

// 3. Fetch all records from spreadsheet
export const fetchRecords = async (accessToken: string, spreadsheetId: string): Promise<PKHRecord[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:P`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh baris dari Google Sheets: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      return [];
    }

    return data.values.map((row: any[], idx: number) => parseRowToRecord(row, idx));
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
};

// 4. Upload photo to Google Drive Bukti folder
export const uploadPhotoToDrive = async (
  accessToken: string,
  file: File,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> => {
  try {
    // Generate clean filename
    const sanitizedName = `PKH_FOTO_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Metadata block
    const metadata = {
      name: sanitizedName,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Gagal mengunggah foto ke Drive: ${uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;
    const webViewLink = uploadData.webViewLink;

    // Enable anyone with direct link permission so it can be viewed / accessed cleanly by spreadsheet
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (permError) {
      console.warn('Gagal mengubah hak akses foto (Anyone Reader), mengabaikan...', permError);
    }

    return { fileId, webViewLink };
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// 5. Add a record to Spreadsheet
export const addRecordToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  record: Omit<PKHRecord, 'id'>
): Promise<PKHRecord> => {
  try {
    const id = `PKH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    const fullRecord: PKHRecord = { ...record, id };

    const rowData = [
      fullRecord.id,
      fullRecord.tanggal,
      fullRecord.namaKpm,
      fullRecord.nikKpm,
      fullRecord.kategori,
      fullRecord.namaSasaran,
      fullRecord.usia || 0,
      fullRecord.beratBadan || 0,
      fullRecord.tinggiBadan || 0,
      fullRecord.imunisasiKia || 'Ya',
      fullRecord.vitaminSuplemen || 'Ya',
      fullRecord.namaFaskes || '',
      fullRecord.keterangan || '',
      fullRecord.linkFoto || '',
      fullRecord.idFotoDrive || '',
      fullRecord.emailPelapor || '',
      fullRecord.triwulan || '',
      fullRecord.bulanPelaporan || '',
      fullRecord.linkFotoFormulir || '',
      fullRecord.idFotoFormulirDrive || '',
      fullRecord.tanggalCatatan || '',
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal menyimpan baris baru ke Sheet: ${res.statusText}`);
    }

    return fullRecord;
  } catch (error) {
    console.error('Error adding record:', error);
    throw error;
  }
};
