import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  ChevronRight, 
  RefreshCw, 
  Info,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Family } from '../types';
import { 
  fetchRegisteredFamilies, 
  saveFamilyToFirestore, 
  deleteFamilyFromFirestore,
  seedFamiliesToFirestore
} from '../services/firestoreService';

const SAMPLE_CSV_FORMAT = "KPM-001;3201234567890001;Siti Aminah;Jl. Pemuda No.12;02;05;Bogor Timur;Baranangsiang;1;1;0;0;4;Budi Santoso, S.Sos;Aktif";

export default function FamilyDatabase() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterDesa, setFilterDesa] = useState('Semua');

  // Modal / Form state for single family
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newFamily, setNewFamily] = useState<Family>({
    id: '',
    noKk: '',
    nama: '',
    alamat: '',
    rt: '',
    rw: '',
    kecamatan: '',
    desa: '',
    ibuHamil: 0,
    balita: 0,
    lansia: 0,
    disabilitas: 0,
    jumlahAnggota: 1,
    pendamping: '',
    statusPkh: 'Aktif'
  });

  // State for Bulk Import
  const [showImportArea, setShowImportArea] = useState(false);
  const [rawImportData, setRawImportData] = useState('');
  const [delimiter, setDelimiter] = useState('\t'); // tab default for excel copy-paste
  const [importPreview, setImportPreview] = useState<Family[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Load families from database
  const loadFamilies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRegisteredFamilies();
      setFamilies(data);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat basis data keluarga. Periksa internet atau firebase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  // Quick auto-generator of clean IDs
  useEffect(() => {
    if (showAddModal && !newFamily.id) {
      setNewFamily(prev => ({
        ...prev,
        id: `KPM-${Math.floor(100 + Math.random() * 900)}`
      }));
    }
  }, [showAddModal, newFamily.id]);

  // Handle single manual addition
  const handleSaveFamily = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate
    if (!newFamily.id.trim() || !newFamily.noKk.trim() || !newFamily.nama.trim()) {
      setError('Harap lengkapi ID, No KK, dan Nama Lengkap.');
      return;
    }
    if (newFamily.noKk.length !== 16 || !/^\d+$/.test(newFamily.noKk)) {
      setError('Nomor KK harus tepat 16 digit angka.');
      return;
    }

    setIsSaving(true);
    try {
      await saveFamilyToFirestore(newFamily);
      setSuccessMsg(`Berhasil mendaftarkan keluarga ${newFamily.nama} (KK: ${newFamily.noKk}) ke database.`);
      setShowAddModal(false);
      
      // Reset form
      setNewFamily({
        id: '',
        noKk: '',
        nama: '',
        alamat: '',
        rt: '',
        rw: '',
        kecamatan: '',
        desa: '',
        ibuHamil: 0,
        balita: 0,
        lansia: 0,
        disabilitas: 0,
        jumlahAnggota: 1,
        pendamping: '',
        statusPkh: 'Aktif'
      });
      
      await loadFamilies();
    } catch (err) {
      setError('Gagal menyimpan data keluarga baru.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deletion
  const handleDeleteFamily = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus silsilah KK ${nama} (ID: ${id}) dari sistem sasar PKH?`)) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteFamilyFromFirestore(id);
      setSuccessMsg(`Data keluarga ${nama} berhasil dihapus dari server.`);
      await loadFamilies();
    } catch (err) {
      setError('Gagal menghapus data keluarga.');
    }
  };

  // Live parser for bulk text copy-pasted from Excel or CSV
  const handleParseImport = () => {
    setImportError(null);
    setImportPreview([]);

    if (!rawImportData.trim()) {
      setImportError('Silakan tempel/paste baris data dari Excel terlebih dahulu.');
      return;
    }

    try {
      const lines = rawImportData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const parsedList: Family[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Split with the chosen delimiter
        const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

        if (cols.length < 3) {
          throw new Error(`Baris ke-${i + 1} tidak memiliki kolom yang cukup (minimal ID, No KK, dan Nama).`);
        }

        // Map column indices:
        // 0: ID, 1: No KK, 2: Nama, 3: Alamat, 4: RT, 5: RW, 6: Kecamatan, 7: Desa,
        // 8: Ibu Hamil, 9: Balita, 10: Lansia, 11: Disabilitas, 12: Jumlah Anggota, 13: Pendamping, 14: Status PKH
        const pId = cols[0] || `KPM-IMP-${Date.now()}-${i}`;
        const pNoKk = cols[1];
        const pNama = cols[2];

        if (!pNoKk || pNoKk.length !== 16 || !/^\d+$/.test(pNoKk)) {
          throw new Error(`Kesalahan Format pada baris ke-${i + 1}: No KK "${pNoKk}" harus 16 digit angka.`);
        }
        if (!pNama) {
          throw new Error(`Kesalahan Format pada baris ke-${i + 1}: Nama tidak boleh kosong.`);
        }

        const fam: Family = {
          id: pId,
          noKk: pNoKk,
          nama: pNama,
          alamat: cols[3] || 'Alamat tidak diinput',
          rt: cols[4] || '00',
          rw: cols[5] || '00',
          kecamatan: cols[6] || 'Kecamatan Utama',
          desa: cols[7] || 'Desa Utama',
          ibuHamil: Number(cols[8]) || 0,
          balita: Number(cols[9]) || 0,
          lansia: Number(cols[10]) || 0,
          disabilitas: Number(cols[11]) || 0,
          jumlahAnggota: Number(cols[12]) || 1,
          pendamping: cols[13] || 'Petupas PKH',
          statusPkh: cols[14] || 'Aktif'
        };

        parsedList.push(fam);
      }

      setImportPreview(parsedList);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memparsing teks.');
    }
  };

  // Submit bulk load to Firestore
  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      await seedFamiliesToFirestore(importPreview);
      setSuccessMsg(`Berhasil mengimpor batch ${importPreview.length} data keluarga sasaran real dari Excel!`);
      setShowImportArea(false);
      setRawImportData('');
      setImportPreview([]);
      await loadFamilies();
    } catch (err) {
      setError('Gagal mengunggah data keluarga massal ke Cloud Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // Download template CSV Helper
  const handleDownloadTemplate = () => {
    const headers = "ID\tNo KK\tNama\tAlamat\tRT\tRW\tKecamatan\tDesa\tIbu Hamil\tBalita\tLansia\tDisabilitas\tJumlah Anggota\tPendamping\tStatus PKH\n";
    const sampleRow = "KPM-001\t3201234567890001\tSiti Aminah\tJl. Pemuda No. 12\t02\t05\tBogor Timur\tBaranangsiang\t1\t1\t0\t0\t4\tBudi Santoso, S.Sos\tAktif\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Database_Keluarga_PKH.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering list
  const uniqueDesa = Array.from(new Set(families.map(f => f.desa).filter(Boolean)));
  
  const filteredFamilies = families.filter(fam => {
    const matchesSearch = 
      fam.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fam.noKk.includes(searchTerm) ||
      fam.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fam.pendamping.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'Semua' || fam.statusPkh === filterStatus;
    const matchesDesa = filterDesa === 'Semua' || fam.desa === filterDesa;

    return matchesSearch && matchesStatus && matchesDesa;
  });

  return (
    <div className="space-y-6" id="family-database-module">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-indigo-650" />
            Sistem Kelola Sasaran & Basis Data Keluarga (KPM)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar keluarga yang resmi terdaftar. Sesuai aturan, pelaporan mandiri hanya valid khusus untuk Nomor KK yang ada di sini.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setShowImportArea(!showImportArea);
              setShowAddModal(false);
            }}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Impor dari Excel / CSV
          </button>
          
          <button
            onClick={() => {
              setShowAddModal(true);
              setShowImportArea(false);
            }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Keluarga
          </button>
        </div>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl flex items-center gap-3 text-xs text-rose-800 font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* COMPACT BATCH SPREADSHEET IMPORT AREA */}
      {showImportArea && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-3xs animate-fade-in">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                Dua Langkah Mudah Impor Data Nyata (Real) dari Excel ke Database PKH
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Salin baris-baris data di Excel Anda lalu tempelkan (paste) langsung ke kotak di bawah untuk menghemat waktu.
              </p>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="text-[11px] font-bold text-indigo-650 hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
            >
              <Download className="w-3.5 h-3.5" /> Template Excel Tab-Delimited
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                1. Tempelkan Data Terformat Di Sini
              </label>
              <textarea
                rows={6}
                value={rawImportData}
                onChange={(e) => setRawImportData(e.target.value)}
                placeholder={`Contoh baris Excel/Teks:\nKPM-001\t3201234567890001\tNama Keluarga\tJl Raya Sukabumi No 5\t01\t04\tBogor\tDesa\t1\t1\t0\t0\t4\tBudi\tAktif`}
                className="w-full text-[11px] font-mono p-4 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              ></textarea>

              <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-150">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span>Pemisah Karakter (Delimiter):</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="delimiter" 
                      checked={delimiter === '\t'} 
                      onChange={() => setDelimiter('\t')} 
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tab (Salinan Excel)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="delimiter" 
                      checked={delimiter === ';'} 
                      onChange={() => setDelimiter(';')} 
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Titik Koma (;)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleParseImport}
                  className="bg-slate-900 hover:bg-slate-850 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide cursor-pointer uppercase"
                >
                  Periksa Format Data (Pratinjau)
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 text-xs font-medium text-slate-600">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-indigo-700">
                <Info className="w-3.5 h-3.5" />
                Urutan Kolom Excel / Lembar Sebar:
              </span>
              <ol className="list-decimal pl-4.5 space-y-1.5 text-[11px] text-slate-600 leading-tight">
                <li><strong>ID Keluarga</strong> (misal: <code>KPM-001</code>)</li>
                <li><strong>No KK</strong> (16 digit angka)</li>
                <li><strong>Nama Kepala Keluarga</strong></li>
                <li><strong>Alamat Jalan / Kp</strong></li>
                <li><strong>RT</strong> &amp; <strong>RW</strong></li>
                <li><strong>Kecamatan</strong> &amp; <strong>Desa/Kel</strong></li>
                <li>Jumlah sasaran: <strong>Ibu Hamil, Balita, Lansia, Disabilitas</strong></li>
                <li><strong>Jumlah Anggota</strong> (angka)</li>
                <li><strong>Nama Pendamping PKH</strong></li>
                <li><strong>Status PKH</strong> (<code>Aktif</code> / <code>Graduasi Mandiri</code>)</li>
              </ol>
            </div>
          </div>

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 font-semibold animate-shake">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4 animate-fade-in">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Pratinjau Hasil Pembacaan ({importPreview.length} Baris Teridentifikasi)</span>
                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-wider">
                  Data Siap Diunggah secara Massal
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                <table className="w-full text-left border-collapse text-[11px] font-medium text-slate-650">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 font-bold text-slate-700">
                    <tr>
                      <th className="p-2">ID</th>
                      <th className="p-2">No KK</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2">Alamat (Kec/Desa)</th>
                      <th className="p-2 text-center">Komponen (H/B/L/D)</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/20 bg-white">
                        <td className="p-2 font-mono font-bold text-indigo-700">{item.id}</td>
                        <td className="p-2 font-mono">{item.noKk}</td>
                        <td className="p-2 font-bold text-slate-800">{item.nama}</td>
                        <td className="p-2">
                          {item.alamat}, RT {item.rt}/RW {item.rw}, {item.desa}, {item.kecamatan}
                        </td>
                        <td className="p-2 text-center font-bold text-indigo-900">
                          {item.ibuHamil}H / {item.balita}B / {item.lansia}L / {item.disabilitas}D
                        </td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {item.statusPkh}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteImport}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all tracking-wide disabled:opacity-50 cursor-pointer uppercase shadow-xs"
                >
                  {isSaving ? 'Menyimpan ke Cloud...' : 'Lakukan Batch Import Sekarang'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs" id="filters">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, nomor KK, ID, atau Pendamping..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {/* Desa Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Kelurahan:</span>
            <select
              value={filterDesa}
              onChange={(e) => setFilterDesa(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Semua">Semua Desa/Kel</option>
              {uniqueDesa.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Status PKH:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Graduasi Mandiri">Graduasi Mandiri</option>
            </select>
          </div>

          <button 
            type="button"
            onClick={loadFamilies}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CORE DATABASE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-650 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Mengambil basis data keluarga resmi...</p>
          </div>
        ) : filteredFamilies.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-850">Keluarga tidak ditemukan</p>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada data keluarga terdaftar yang cocok dengan filter atau kata kunci di atas.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead className="bg-slate-50/80 border-b border-highlight text-slate-450 uppercase text-[9px] tracking-wider font-extrabold">
                <tr>
                  <th className="py-3 px-4">KPM ID</th>
                  <th className="py-3 px-4">No KK (16 digit)</th>
                  <th className="py-3 px-4">NAMA KPM</th>
                  <th className="py-3 px-4">WILAYAH (Kec / Desa / RT / RW)</th>
                  <th className="py-3 px-4 text-center">KOMPONEN TERDAFTAR</th>
                  <th className="py-3 px-4 text-center">ANGGOTA</th>
                  <th className="py-3 px-4">PENDAMPING</th>
                  <th className="py-3 px-4">STATUS PKH</th>
                  <th className="py-3 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFamilies.map((fam) => (
                  <tr key={fam.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-700 text-xs">{fam.id}</td>
                    <td className="py-3.5 px-4 font-mono tracking-wide">{fam.noKk}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {fam.nama}
                    </td>
                    <td className="py-3.5 px-4 leading-relaxed text-[11px] text-slate-600">
                      <div className="max-w-[240px]">
                        <p className="font-bold text-slate-800">{fam.alamat}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          RT {fam.rt} / RW {fam.rw} • {fam.desa}, {fam.kecamatan}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                        {fam.ibuHamil > 0 && (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                            Ibu Hamil: {fam.ibuHamil}
                          </span>
                        )}
                        {fam.balita > 0 && (
                          <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            Balita: {fam.balita}
                          </span>
                        )}
                        {fam.lansia > 0 && (
                          <span className="text-[9px] font-black text-pink-700 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded">
                            Lansia: {fam.lansia}
                          </span>
                        )}
                        {fam.disabilitas > 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                            Difabel: {fam.disabilitas}
                          </span>
                        )}
                        {!fam.ibuHamil && !fam.balita && !fam.lansia && !fam.disabilitas && (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-250 px-1.5 py-0.5 rounded">
                            Nihil Komponen
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{fam.jumlahAnggota}</td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-650 font-bold">{fam.pendamping}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide inline-block ${
                        fam.statusPkh === 'Aktif'
                          ? 'text-emerald-750 bg-emerald-50 border-emerald-150'
                          : 'text-amber-750 bg-amber-50 border-amber-150'
                      }`}>
                        {fam.statusPkh}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteFamily(fam.id, fam.nama)}
                        className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus data keluarga"
                      >
                        <Trash2 className="w-3.8 h-3.8" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE MANUAL ADDITION DIALOG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-modal">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-light flex justify-between items-center bg-radial bg-inner">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase">
                <UserPlus className="w-4.5 h-4.5 text-indigo-650 font-black" />
                Daftarkan Keluarga KPM Baru
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-950 font-black text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFamily} className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ID KPM (Otomatis/Kustom)</label>
                  <input
                    type="text"
                    required
                    value={newFamily.id}
                    onChange={(e) => setNewFamily({ ...newFamily, id: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Kartu Keluarga (16-Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={newFamily.noKk}
                    onChange={(e) => setNewFamily({ ...newFamily, noKk: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl font-mono text-sm leading-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Wajib 16 digit angka"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Kepala Keluarga (KPM)</label>
                  <input
                    type="text"
                    required
                    value={newFamily.nama}
                    onChange={(e) => setNewFamily({ ...newFamily, nama: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Contoh: Siti Aminah"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pendamping Sosial</label>
                  <input
                    type="text"
                    value={newFamily.pendamping}
                    onChange={(e) => setNewFamily({ ...newFamily, pendamping: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Contoh: Budi Santoso, S.Sos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alamat Lengkap (Jalan / Kp / Gang)</label>
                <input
                  type="text"
                  value={newFamily.alamat}
                  onChange={(e) => setNewFamily({ ...newFamily, alamat: e.target.value })}
                  className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Contoh: Kp. Caringin Raya No. 45"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RT</label>
                  <input
                    type="text"
                    value={newFamily.rt}
                    onChange={(e) => setNewFamily({ ...newFamily, rt: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl text-center"
                    placeholder="01"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RW</label>
                  <input
                    type="text"
                    value={newFamily.rw}
                    onChange={(e) => setNewFamily({ ...newFamily, rw: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl text-center"
                    placeholder="04"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={newFamily.kecamatan}
                    onChange={(e) => setNewFamily({ ...newFamily, kecamatan: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl"
                    placeholder="Bogor Timur"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desa / Kelurahan</label>
                  <input
                    type="text"
                    value={newFamily.desa}
                    onChange={(e) => setNewFamily({ ...newFamily, desa: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl"
                    placeholder="Baranangsiang"
                  />
                </div>
              </div>

              {/* Dynamic Categories Multiplier */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <span className="block text-[10px] font-black text-indigo-750 uppercase tracking-wider">
                  Alokasi Komponen Terdaftar:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <label className="block text-[9px] text-slate-550 uppercase mb-1 font-bold">Ibu Hamil</label>
                    <input
                      type="number"
                      min={0}
                      value={newFamily.ibuHamil}
                      onChange={(e) => setNewFamily({ ...newFamily, ibuHamil: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-550 uppercase mb-1 font-bold">Balita</label>
                    <input
                      type="number"
                      min={0}
                      value={newFamily.balita}
                      onChange={(e) => setNewFamily({ ...newFamily, balita: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-550 uppercase mb-1 font-bold">Lansia</label>
                    <input
                      type="number"
                      min={0}
                      value={newFamily.lansia}
                      onChange={(e) => setNewFamily({ ...newFamily, lansia: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-550 uppercase mb-1 font-bold">Difabel</label>
                    <input
                      type="number"
                      min={0}
                      value={newFamily.disabilitas}
                      onChange={(e) => setNewFamily({ ...newFamily, disabilitas: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jumlah Anggota Keluarga</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newFamily.jumlahAnggota}
                    onChange={(e) => setNewFamily({ ...newFamily, jumlahAnggota: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status PKH Keluarga</label>
                  <select
                    value={newFamily.statusPkh}
                    onChange={(e) => setNewFamily({ ...newFamily, statusPkh: e.target.value })}
                    className="w-full bg-white border border-slate-250 px-3 py-2.5 rounded-xl cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Graduasi Mandiri">Graduasi Mandiri</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-4 py-2.5 rounded-xl uppercase tracking-wider text-[10px] font-black cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl uppercase tracking-wider text-[10px] font-black disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Keluarga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
