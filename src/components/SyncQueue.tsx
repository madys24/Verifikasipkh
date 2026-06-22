import { useState } from 'react';
import { 
  CloudLightning, 
  Trash2, 
  UserCheck, 
  Calendar, 
  Tag, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  Play, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle,
  FileImage,
  RefreshCw,
  Info
} from 'lucide-react';
import { PendingReport, deleteFromQueue, base64ToFile } from '../services/firestoreService';
import { uploadPhotoToDrive, addRecordToSheet } from '../services/googleWorkspace';
import { PKHRecord } from '../types';

interface SyncQueueProps {
  queue: PendingReport[];
  spreadsheetId: string | null;
  folderId: string | null;
  token: string | null;
  onSyncCompleted: () => void;
  onRefresh: () => void;
}

export default function SyncQueue({
  queue,
  spreadsheetId,
  folderId,
  token,
  onSyncCompleted,
  onRefresh,
}: SyncQueueProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Expanded image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Action: Delete report from queue manually without syncing
  const handleDeleteReport = async (id?: string) => {
    if (!id) return;
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus laporan ini dari antrean? Data laporan ini akan hilang permanen dan tidak akan masuk ke Google Sheets.'
    );
    if (!confirmed) return;

    try {
      await deleteFromQueue(id);
      onRefresh();
    } catch (err: any) {
      alert('Gagal menghapus laporan: ' + err.message);
    }
  };

  // Action: Run batch sync pipeline
  const handleStartSync = async () => {
    setErrorMsg(null);
    setSuccessCount(null);

    if (!token) {
      setErrorMsg('Izin Google kadaluarsa. Silakan masuk kembali sebagai Admin.');
      return;
    }
    if (!spreadsheetId || !folderId) {
      setErrorMsg('Tautan database Google Sheets / Drive belum siap.');
      return;
    }

    const count = queue.length;
    if (count === 0) return;

    const confirmed = window.confirm(
      `Apakah Anda menyetujui dan ingin memproses sinkronisasi sebanyak ${count} laporan mandiri dari KPM?\n\n` +
      `Sistem akan mengunggah gambar kegiatan & formulir ke Google Drive Anda, lalu menuliskan baris datanya ke Google Sheet secara otomatis.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: count });

    let successTracker = 0;

    for (let i = 0; i < count; i++) {
      const report = queue[i];
      try {
        let linkFoto = '';
        let idFotoDrive = '';
        let linkFotoFormulir = '';
        let idFotoFormulirDrive = '';

        // 1. Convert base64 to native File and upload Foto Kegiatan
        if (report.fotoKegiatanBase64) {
          const fileKegiatan = base64ToFile(
            report.fotoKegiatanBase64, 
            `kegiatan_${report.nikKpm}_${report.bulanPelaporan}.jpg`
          );
          const uploadResult = await uploadPhotoToDrive(token, fileKegiatan, folderId);
          linkFoto = uploadResult.webViewLink;
          idFotoDrive = uploadResult.fileId;
        }

        // 2. Convert base64 to native File and upload Foto Formulir
        if (report.fotoFormulirBase64) {
          const fileFormulir = base64ToFile(
            report.fotoFormulirBase64, 
            `formulir_${report.nikKpm}_${report.bulanPelaporan}.jpg`
          );
          const uploadResult = await uploadPhotoToDrive(token, fileFormulir, folderId);
          linkFotoFormulir = uploadResult.webViewLink;
          idFotoFormulirDrive = uploadResult.fileId;
        }

        // 3. Save Record to Main Google Grid Sheet
        const finalRecord: PKHRecord = {
          id: '',
          tanggal: report.tanggal,
          namaKpm: report.namaKpm,
          nikKpm: report.nikKpm,
          kategori: report.kategori,
          namaSasaran: report.namaSasaran,
          keterangan: report.keterangan || '-',
          emailPelapor: report.emailPelapor,
          triwulan: report.triwulan,
          bulanPelaporan: report.bulanPelaporan,
          tanggalCatatan: report.tanggalCatatan,
          linkFoto,
          idFotoDrive,
          linkFotoFormulir,
          idFotoFormulirDrive,
        };

        await addRecordToSheet(token, spreadsheetId, finalRecord);

        // 4. Clean up queue doc from Firestore
        if (report.id) {
          await deleteFromQueue(report.id);
        }

        successTracker++;
        setSyncProgress((prev) => ({ ...prev, current: i + 1 }));
      } catch (err: any) {
        console.error(`Kendala syncing laporan ke-${i + 1}:`, err);
        setErrorMsg(
          `Gagal menyinkronkan laporan milik ${report.namaKpm} (${report.namaSasaran}). Proses dihentikan sementara agar tidak ada data yang hilang.`
        );
        break;
      }
    }

    setIsSyncing(false);
    setSuccessCount(successTracker);
    onSyncCompleted();
  };

  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="queue-view">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Antrean Laporan Mandiri KPM
            {queue.length > 0 && (
              <span className="bg-amber-100 border border-amber-200 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-black animate-pulse">
                {queue.length} Tertunda
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar laporan yang dikirimkan secara mandiri oleh keluarga KPM dari gawai masing-masing. Tekan tombol sinkronisasi untuk memasukkannya ke Google Drive & Sheets Anda.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Muat ulang antrean"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {queue.length > 0 && (
            <button
              onClick={handleStartSync}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer select-none active:scale-95"
            >
              <CloudLightning className="w-4 h-4" />
              Sinkronisasikan Semua ({queue.length})
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-150 rounded-lg text-xs text-red-650 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {successCount !== null && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-lg text-xs text-emerald-650 flex gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">
            Sinkronisasi Selesai! Sebanyak <strong>{successCount} laporan</strong> telah berhasil dipindahkan secara penuh ke Google Drive & Google Sheets Anda. Antrean telah dibersihkan.
          </p>
        </div>
      )}

      {/* Syncing dialog loader */}
      {isSyncing && (
        <div className="p-8 border border-slate-200 bg-white rounded-xl text-center space-y-4 shadow-sm">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Sedang Sinkronisasi Antrean ke Akun Google Anda...</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Sistem sedang mengunduh file foto yang dikompresi dari Cloud Firestore, mengunggahnya langsung ke Google Drive Anda pribadi, menulis baris sel data ke Spreadsheet utama, dan menghapus laporan lama dari antre.
          </p>
          <div className="w-full bg-slate-150 rounded-full h-2.5 max-w-xs mx-auto overflow-hidden">
            <div 
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
          <span className="block text-xs text-amber-600 font-mono font-bold font-semibold">
            {syncProgress.current} dari {syncProgress.total} laporan selesai dipindahkan...
          </span>
        </div>
      )}

      {/* Main content queue */}
      {!isSyncing && (
        queue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {queue.map((report) => (
              <div 
                key={report.id} 
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                {/* Delete trash button */}
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                  title="Abaikan & Hapus dari antrean"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-bold text-pink-700 bg-pink-50 border border-pink-100 rounded px-1.5 py-0.5">
                      Keluarga: {report.namaKpm}
                    </span>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                      {report.triwulan} - {report.bulanPelaporan}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Anggota: {report.namaSasaran} <span className="text-indigo-600">({report.kategori})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">No KK Pengirim: {report.nikKpm}</p>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Tanggal input:</span>
                        <span className="font-mono font-bold text-slate-700">{formatIndoDate(report.tanggal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium font-medium">Tgl Catatan KIA:</span>
                        <span className="font-mono font-bold text-slate-705">{formatIndoDate(report.tanggalCatatan)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Pelapor:</span>
                        <span className="text-slate-500 font-medium underline truncate max-w-[150px]">{report.emailPelapor}</span>
                      </div>
                    </div>

                    {report.keterangan && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border-l-2 border-emerald-500 text-xs">
                        <strong className="block text-[8.5px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Perkembangan/Status:</strong>
                        <p className="text-slate-650 leading-relaxed font-medium">{report.keterangan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proof images block */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500">Pratinjau Bukti Visual KPM :</span>

                  <div className="flex gap-2">
                    {report.fotoKegiatanBase64 && (
                      <button
                        onClick={() => setPreviewImage(report.fotoKegiatanBase64)}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-[10px] text-slate-705 font-bold px-2 py-1 rounded cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        Foto Kegiatan
                      </button>
                    )}

                    {report.fotoFormulirBase64 && (
                      <button
                        onClick={() => setPreviewImage(report.fotoFormulirBase64)}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-[10px] text-slate-705 font-bold px-2 py-1 rounded cursor-pointer transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        KIA/Formulir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 text-center rounded-xl flex flex-col items-center">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3.5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Antrean Bersih & Rapi!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm leading-normal font-medium">
              Tidak ada laporan mandiri KPM tertunda di Cloud Firestore. Semua data dari keluarga PKH Anda telah disinkronkan secara sempurna ke Spreadsheet & Google Drive Anda.
            </p>
          </div>
        )
      )}

      {/* Lightbox / Image Viewer */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in animate-duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div className="bg-white p-2 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg cursor-pointer z-10"
            >
              ×
            </button>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center rounded-lg">
              <img 
                src={previewImage} 
                alt="Bukti Asli KPM" 
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
