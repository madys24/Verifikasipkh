import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/firebaseAuth';
import { 
  findOrCreateSpreadsheet, 
  findOrCreateFolder, 
  fetchRecords, 
  addRecordToSheet, 
  uploadPhotoToDrive 
} from './services/googleWorkspace';
import { 
  PendingReport, 
  saveReportToQueue, 
  fetchPendingQueue, 
  compressImage 
} from './services/firestoreService';
import { PKHRecord } from './types';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import RecordHistory from './components/RecordHistory';
import SyncQueue from './components/SyncQueue';
import FamilyDatabase from './components/FamilyDatabase';

import { 
  Activity, 
  FileSpreadsheet, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCcw,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false); // Do not block visitors Initially!
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Google Workspace Resources States
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [records, setRecords] = useState<PKHRecord[]>([]);

  // Firestore Queue States (KPM Pending Offline-first Queue)
  const [pendingQueue, setPendingQueue] = useState<PendingReport[]>([]);

  // Page Tab States - Default to Form so families can report instantly!
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'history' | 'queue' | 'families'>('form');
  const [loadingResources, setLoadingResources] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);

  // 1. Initialize Firebase Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        // Switch logged in admins to dashboard automatically
        setActiveTab('dashboard');
      },
      () => {
        setUser(null);
        setToken(null);
        // Reset navigation to public form
        setActiveTab('form');
      }
    );

    return () => unsubscribe();
  }, []);

  // 1b. Fetch Pending Queue periodically or on load
  const loadPendingQueue = useCallback(async () => {
    try {
      const queue = await fetchPendingQueue();
      setPendingQueue(queue);
    } catch (err) {
      console.error('Ada kendala membaca antrean Firestore:', err);
    }
  }, []);

  useEffect(() => {
    loadPendingQueue();
  }, [loadPendingQueue]);

  // 2. Load Google Workspace Database & Drive Folder for Admin
  const loadWorkspaceResources = useCallback(async (accessToken: string) => {
    setLoadingResources(true);
    setResourceError(null);
    try {
      // Step A: Find or Create Google Sheet
      const sheetId = await findOrCreateSpreadsheet(accessToken);
      setSpreadsheetId(sheetId);
      localStorage.setItem('pkh_database_sheet_id', sheetId);

      // Step B: Find or Create Google Drive photo folder
      const fId = await findOrCreateFolder(accessToken);
      setFolderId(fId);
      localStorage.setItem('pkh_photo_folder_id', fId);

      // Step C: Fetch existing records from sheet
      const sheetRecords = await fetchRecords(accessToken, sheetId);
      setRecords(sheetRecords);
    } catch (err: any) {
      console.error('Ada kendala memuat integrasi Google Workspace:', err);
      setResourceError(
        'Gagal menyinkronkan dengan Google Sheets/Drive. Silakan klik tombol Masuk kembali untuk mereset izin akses jika dibutuhkan.'
      );
    } finally {
      setLoadingResources(false);
    }
  }, []);

  // Trigger resource load when token changes (Admin Session established)
  useEffect(() => {
    if (token) {
      loadWorkspaceResources(token);
    }
  }, [token, loadWorkspaceResources]);

  // Retriggers pending queue and workspace dataset reload on completed synchronization
  const handleSyncCompleted = async () => {
    await loadPendingQueue();
    const activeToken = token || getAccessToken();
    if (activeToken && spreadsheetId) {
      setSyncing(true);
      try {
        const freshRecords = await fetchRecords(activeToken, spreadsheetId);
        setRecords(freshRecords);
      } catch (err) {
        console.error('Sync reload failed:', err);
      } finally {
        setSyncing(false);
      }
    }
  };

  // 3. User Sign in handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setResourceError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      console.error('Sign in process failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. User Log out handler
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSpreadsheetId(null);
      setFolderId(null);
      setRecords([]);
      setActiveTab('form');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // 5. Sync/Refresh data from sheets manual action (Admin action)
  const handleSyncData = async () => {
    const accessToken = token || getAccessToken();
    if (!accessToken || !spreadsheetId) return;

    setSyncing(true);
    try {
      const freshRecords = await fetchRecords(accessToken, spreadsheetId);
      setRecords(freshRecords);
      await loadPendingQueue();
    } catch (err) {
      console.error('Gagal memuat ulang data:', err);
    } finally {
      setSyncing(false);
    }
  };

  // 6. Append new record from submission form (Now deprecated in favor of Batch/Queue reporting)
  const handleAddRecord = async (
    recordData: Omit<PKHRecord, 'id' | 'linkFoto' | 'idFotoDrive'>,
    photoFile: File | null
  ) => {
    const accessToken = token || getAccessToken();
    if (!accessToken) {
      throw new Error('Akses ditolak. Sesi login kadaluarsa.');
    }
    if (!spreadsheetId || !folderId) {
      throw new Error('Database Google Sheets/Drive belum terhubung penuh.');
    }

    let linkFoto = '';
    let idFotoDrive = '';

    // Upload photo to Drive if attached
    if (photoFile) {
      const uploadResult = await uploadPhotoToDrive(accessToken, photoFile, folderId);
      linkFoto = uploadResult.webViewLink;
      idFotoDrive = uploadResult.fileId;
    }

    // Write to Spreadsheet
    const finalRecord = {
      ...recordData,
      linkFoto,
      idFotoDrive,
    };

    const savedRecord = await addRecordToSheet(accessToken, spreadsheetId, finalRecord);
    
    // Optimistic UI state updates
    setRecords((prev) => [savedRecord, ...prev]);
    setActiveTab('dashboard');
  };

  // 6b. Directly sync and insert reporting lines to Google Sheets (Admin flow)
  const handleAddBatchRecords = async (
    rows: Array<{
      recordData: Omit<PKHRecord, 'id' | 'linkFoto' | 'idFotoDrive' | 'linkFotoFormulir' | 'idFotoFormulirDrive'>;
      fotoKegiatan: File | null;
      fotoFormulir: File | null;
    }>
  ) => {
    const accessToken = token || getAccessToken();
    if (!accessToken) {
      throw new Error('Akses ditolak. Sesi login kadaluarsa.');
    }
    if (!spreadsheetId || !folderId) {
      throw new Error('Database Google Sheets/Drive belum terhubung penuh.');
    }

    const savedList: PKHRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      let linkFoto = '';
      let idFotoDrive = '';
      let linkFotoFormulir = '';
      let idFotoFormulirDrive = '';

      if (item.fotoKegiatan) {
        const uploadResult = await uploadPhotoToDrive(accessToken, item.fotoKegiatan, folderId);
        linkFoto = uploadResult.webViewLink;
        idFotoDrive = uploadResult.fileId;
      }

      if (item.fotoFormulir) {
        const uploadResult = await uploadPhotoToDrive(accessToken, item.fotoFormulir, folderId);
        linkFotoFormulir = uploadResult.webViewLink;
        idFotoFormulirDrive = uploadResult.fileId;
      }

      const finalRecord = {
        ...item.recordData,
        linkFoto,
        idFotoDrive,
        linkFotoFormulir,
        idFotoFormulirDrive,
      };

      const savedRecord = await addRecordToSheet(accessToken, spreadsheetId, finalRecord);
      savedList.push(savedRecord);
    }

    setRecords((prev) => [...savedList, ...prev]);
    setActiveTab('dashboard');
  };

  // 6c. KPM flow: Save to Cloud Queue in Firestore without Google Authentication
  const handleAddBatchToQueue = async (
    rows: Array<{
      recordData: any;
      fotoKegiatan: File | null;
      fotoFormulir: File | null;
    }>
  ) => {
    try {
      for (const item of rows) {
        let fotoKegiatanBase64 = '';
        let fotoFormulirBase64 = '';

        // 1. Compress & convert Foto Kegiatan to web-safe Base64
        if (item.fotoKegiatan) {
          fotoKegiatanBase64 = await compressImage(item.fotoKegiatan);
        }

        // 2. Compress & convert Foto Formulir to web-safe Base64
        if (item.fotoFormulir) {
          fotoFormulirBase64 = await compressImage(item.fotoFormulir);
        }

        // 3. Save directly to Cloud Firestore Pending Queue
        await saveReportToQueue({
          namaKpm: item.recordData.namaKpm,
          nikKpm: item.recordData.nikKpm,
          kategori: item.recordData.kategori,
          namaSasaran: item.recordData.namaSasaran,
          tanggal: item.recordData.tanggal,
          triwulan: item.recordData.triwulan,
          bulanPelaporan: item.recordData.bulanPelaporan,
          tanggalCatatan: item.recordData.tanggalCatatan,
          keterangan: item.recordData.keterangan || '',
          fotoKegiatanBase64,
          fotoFormulirBase64,
          emailPelapor: 'kpm.mandiri@pkhsehat.id',
        });
      }

      // Reload antrean internally
      await loadPendingQueue();
    } catch (error: any) {
      console.error('Queue submission failed:', error);
      throw new Error('Gagal mengirimkan data ke awan. Periksa sambungan koneksi internet Anda: ' + error.message);
    }
  };

  // Render Loader screen during Google Workspace resource linkage (Admin only)
  if (loadingResources && user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4" id="resource-linking-loader">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Menghubungkan Database Google...</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Mempersiapkan spreadsheet database dan direktori berkas Google Drive secara real-time...
          </p>
        </div>
      </div>
    );
  }

  // Render errors if synchronization failed with Google Workspace (Admin only)
  if (resourceError && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4" id="resource-error-screen">
        <div className="bg-white max-w-md w-full border border-red-150 rounded-2xl p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-base font-bold text-slate-900">Akses Google Workspace Ditolak</h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-2.5 mb-6 font-medium">
            {resourceError}
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Main interactive state
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="main-app">
      <Navbar
        user={user}
        spreadsheetId={spreadsheetId}
        folderId={folderId}
        onLogout={handleLogout}
        syncing={syncing}
        onSync={handleSyncData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={pendingQueue.length}
        onAdminLoginClick={handleLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time synchronization banner under navbar - Show ONLY to authorized logged-in Admin in Admin tabs */}
        {user && activeTab !== 'form' && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between border border-slate-200 bg-white px-5 py-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 border border-indigo-105 rounded-lg flex items-center justify-center text-indigo-650">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900 leading-none">Database & G-Drive Terkoneksi</span>
                <span className="block text-[10px] text-slate-400 mt-1 truncate max-w-[280px] sm:max-w-none font-mono font-medium">
                  Penyimpanan Awan Aktif: ID {spreadsheetId?.slice(0, 16)}...
                </span>
              </div>
            </div>
            
            <button
              onClick={handleSyncData}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-100 px-3.5 py-2.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer font-sans"
            >
              <RefreshCcw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Mengunduh...' : 'Sinkronisasi Ulang'}
            </button>
          </div>
        )}

        {/* Tab content router */}
        {activeTab === 'dashboard' && user && <Dashboard records={records} />}
        {activeTab === 'form' && (
          <ReportForm
            userEmail={user?.email || 'admin@pkhsehat.id'}
            isAdminLoggedIn={user !== null}
            onAddRecord={handleAddRecord}
            onAddBatch={user ? handleAddBatchRecords : handleAddBatchToQueue}
          />
        )}
        {activeTab === 'queue' && user && (
          <SyncQueue
            queue={pendingQueue}
            spreadsheetId={spreadsheetId}
            folderId={folderId}
            token={token}
            onSyncCompleted={handleSyncCompleted}
            onRefresh={loadPendingQueue}
          />
        )}
        {activeTab === 'history' && user && (
          <RecordHistory 
            records={records} 
            spreadsheetId={spreadsheetId}
          />
        )}
        {activeTab === 'families' && user && (
          <FamilyDatabase />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-[11px] text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="font-extrabold text-slate-700 tracking-tight uppercase">PKH Sehat</span>
          </div>
          <p>© 2026 Program Keluarga Harapan RI. Seluruh hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
