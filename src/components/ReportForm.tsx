import { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  Baby, 
  Users, 
  Search, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ShieldAlert, 
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Check,
  Play
} from 'lucide-react';
import { PKHRecord, Family } from '../types';
import { fetchRegisteredFamilies, seedFamiliesToFirestore } from '../services/firestoreService';

interface ReportFormProps {
  userEmail: string;
  isAdminLoggedIn: boolean;
  onAddRecord: (record: Omit<PKHRecord, 'id' | 'linkFoto' | 'idFotoDrive'>, photoFile: File | null) => Promise<void>;
  onAddBatch?: (
    rows: Array<{
      recordData: Omit<PKHRecord, 'id' | 'linkFoto' | 'idFotoDrive' | 'linkFotoFormulir' | 'idFotoFormulirDrive'>;
      fotoKegiatan: File | null;
      fotoFormulir: File | null;
    }>
  ) => Promise<void>;
}

const MOCK_FAMILIES = [
  {
    id: 'KPM-001',
    noKk: '3201234567890001',
    nama: 'Siti Aminah',
    alamat: 'Jl. Pemuda No. 12, Kel. Baranangsiang',
    rt: '02',
    rw: '05',
    kecamatan: 'Bogor Timur',
    desa: 'Baranangsiang',
    ibuHamil: 1,
    balita: 1,
    lansia: 0,
    disabilitas: 0,
    jumlahAnggota: 4,
    pendamping: 'Budi Santoso, S.Sos',
    statusPkh: 'Aktif'
  },
  {
    id: 'KPM-002',
    noKk: '3201234567890002',
    nama: 'Aminah Hasanah',
    alamat: 'Kp. Caringin Raya No. 45, Kel. Bojongkerta',
    rt: '04',
    rw: '01',
    kecamatan: 'Bogor Selatan',
    desa: 'Bojongkerta',
    ibuHamil: 0,
    balita: 2,
    lansia: 1,
    disabilitas: 0,
    jumlahAnggota: 5,
    pendamping: 'Budi Santoso, S.Sos',
    statusPkh: 'Aktif'
  },
  {
    id: 'KPM-003',
    noKk: '3201234567890003',
    nama: 'Dewi Sartika',
    alamat: 'Jl. RE Martadinata Gang Masjid III No. 9',
    rt: '01',
    rw: '12',
    kecamatan: 'Bogor Tengah',
    desa: 'Babakan',
    ibuHamil: 1,
    balita: 0,
    lansia: 0,
    disabilitas: 1,
    jumlahAnggota: 3,
    pendamping: 'Siti Julaiha, S.Pd',
    statusPkh: 'Aktif'
  },
  {
    id: 'KPM-004',
    noKk: '3201234567890004',
    nama: 'Rina Marlina',
    alamat: 'Dusun Sukamaju RT 03 RW 09, Kel. Ciawi',
    rt: '03',
    rw: '09',
    kecamatan: 'Ciawi',
    desa: 'Sukamaju',
    ibuHamil: 1,
    balita: 1,
    lansia: 2,
    disabilitas: 0,
    jumlahAnggota: 6,
    pendamping: 'Siti Julaiha, S.Pd',
    statusPkh: 'Graduasi Mandiri'
  }
];

const TRIWULAN_MONTHS: Record<string, string[]> = {
  'Triwulan I': ['Januari', 'Februari', 'Maret'],
  'Triwulan II': ['April', 'Mei', 'Juni'],
  'Triwulan III': ['Juli', 'Agustus', 'September'],
  'Triwulan IV': ['Oktober', 'November', 'Desember'],
};

interface MemberInput {
  index: number;
  kategori: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
  nama: string;
}

interface MonthlyReportState {
  id: string; // unique reference
  memberIndex: number;
  memberName: string;
  kategori: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
  bulan: string;
  tanggalCatatan: string;
  catatan: string;
  fotoKegiatan: File | null;
  fotoKegiatanPreview: string | null;
  fotoFormulir: File | null;
  fotoFormulirPreview: string | null;
}

export default function ReportForm({ userEmail, isAdminLoggedIn, onAddRecord, onAddBatch }: ReportFormProps) {
  // Wizard steps: 1 (Search & Trimester), 2 (Member Names), 3 (Input Monthly Reports)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // DYNAMIC FAMILIES DATABASE FROM FIRESTORE
  const [families, setFamilies] = useState<Family[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);

  // Load families from Firestore on mount
  useEffect(() => {
    let active = true;
    const loadFamilies = async () => {
      try {
        const firestoreFamilies = await fetchRegisteredFamilies();
        if (active) {
          if (firestoreFamilies && firestoreFamilies.length > 0) {
            setFamilies(firestoreFamilies);
          } else {
            // First time/empty fallback: seed MOCK_FAMILIES to Firestore
            await seedFamiliesToFirestore(MOCK_FAMILIES);
            const fresh = await fetchRegisteredFamilies();
            setFamilies(fresh.length > 0 ? fresh : MOCK_FAMILIES);
          }
        }
      } catch (err) {
        console.error('Failed to load families from firestore, utilizing mock constants', err);
        if (active) {
          setFamilies(MOCK_FAMILIES);
        }
      } finally {
        if (active) {
          setLoadingFamilies(false);
        }
      }
    };
    loadFamilies();
    return () => {
      active = false;
    };
  }, []);

  // STEP 1 STATES
  const [noKkInput, setNoKkInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [familyFound, setFamilyFound] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  
  // Family Profile details (linked or manually created)
  const [namaKpm, setNamaKpm] = useState('');
  const [noKkVerified, setNoKkVerified] = useState('');
  const [komponenCounts, setKomponenCounts] = useState<Record<string, number>>({
    'Ibu Hamil': 0,
    'Balita': 0,
    'Lansia': 0,
    'Disabilitas': 0
  });

  const [selectedTriwulan, setSelectedTriwulan] = useState('Triwulan II');

  // STEP 2 STATES
  const [members, setMembers] = useState<MemberInput[]>([]);

  // STEP 3 STATES
  const [reports, setReports] = useState<MonthlyReportState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Action: Search Family Card (No KK)
  const handleSearchKK = () => {
    setErrorMsg(null);
    if (!noKkInput.trim()) {
      setErrorMsg('Masukkan nomor Kartu Keluarga (KK) terlebih dahulu.');
      return;
    }
    if (noKkInput.length !== 16 || !/^\d+$/.test(noKkInput)) {
      setErrorMsg('Sesuai aturan, nomor KK harus berisi 16 digit angka.');
      return;
    }

    const found = families.find(f => f.noKk === noKkInput);
    setSearched(true);
    if (found) {
      setFamilyFound(true);
      setSelectedFamily(found);
      setNamaKpm(found.nama);
      setNoKkVerified(found.noKk);
      setKomponenCounts({
        'Ibu Hamil': found.ibuHamil,
        'Balita': found.balita,
        'Lansia': found.lansia,
        'Disabilitas': found.disabilitas
      });
    } else {
      // Unregistered KK - show error and deny entry
      setFamilyFound(false);
      setSelectedFamily(null);
      setNamaKpm('');
      setNoKkVerified('');
      setErrorMsg('Nomor Kartu Keluarga (KK) tidak ditemukan/tidak terdaftar dalam basis data sasaran PKH Sehat. Pelaporan mandiri hanya valid untuk Nomor KK yang resmi terdaftar saja.');
      setKomponenCounts({
        'Ibu Hamil': 0,
        'Balita': 0,
        'Lansia': 0,
        'Disabilitas': 0
      });
    }
  };

  // Action: Move to Step 2 (Naming Members)
  const handleProceedToStep2 = () => {
    setErrorMsg(null);
    if (!familyFound) {
      setErrorMsg('Hanya Nomor KK resmi terdaftar yang diizinkan untuk melakukan pelaporan.');
      return;
    }
    if (!namaKpm.trim()) {
      setErrorMsg('Nama Penerima KPM wajib diisi.');
      return;
    }

    const sumComponents = Object.values(komponenCounts).reduce((a, b) => (a as number) + (b as number), 0) as number;
    if (sumComponents === 0) {
      setErrorMsg('Pilih minimal 1 komponen kesehatan PKH dalam keluarga.');
      return;
    }

    // Build list of member entry fields
    const list: MemberInput[] = [];
    let idx = 0;
    
    Object.entries(komponenCounts).forEach(([kategori, count]) => {
      const cnt = count as number;
      for (let i = 0; i < cnt; i++) {
        list.push({
          index: idx++,
          kategori: kategori as any,
          nama: ''
        });
      }
    });

    setMembers(list);
    setStep(2);
  };

  // Action: Move to Step 3 (Generating Trimester Rows)
  const handleProceedToStep3 = () => {
    setErrorMsg(null);
    // Validate members names filled
    const invalid = members.some(m => !m.nama.trim());
    if (invalid) {
      setErrorMsg('Semua nama anggota komponen wajib diisi lengkap.');
      return;
    }

    // Generate month rows (members length * 3 months)
    const months = TRIWULAN_MONTHS[selectedTriwulan] || [];
    const reportList: MonthlyReportState[] = [];

    members.forEach((m) => {
      months.forEach((bulan) => {
        reportList.push({
          id: `${m.index}-${bulan}-${Date.now()}`,
          memberIndex: m.index,
          memberName: m.nama,
          kategori: m.kategori,
          bulan: bulan,
          tanggalCatatan: new Date().toISOString().substring(0, 10), // Today is default
          catatan: '',
          fotoKegiatan: null,
          fotoKegiatanPreview: null,
          fotoFormulir: null,
          fotoFormulirPreview: null
        });
      });
    });

    setReports(reportList);
    setStep(3);
  };

  // Helper file preview handle
  const handleFileSlot = (
    reportId: string, 
    type: 'kegiatan' | 'formulir', 
    file: File | null
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Hanya berkas gambar (.jpg, .png, .jpeg) yang didukung.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Satu gambar tidak boleh melebihi batas ukuran 5MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReports((prev) => 
        prev.map((rep) => {
          if (rep.id === reportId) {
            return type === 'kegiatan' 
              ? { ...rep, fotoKegiatan: file, fotoKegiatanPreview: reader.result as string }
              : { ...rep, fotoFormulir: file, fotoFormulirPreview: reader.result as string };
          }
          return rep;
        })
      );
    };
    reader.readAsDataURL(file);
  };

  // Action: Submit All Reports
  const handleSubmitBatch = async () => {
    setErrorMsg(null);

    // Validate if any notes or photos are missing
    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      if (!r.catatan.trim()) {
        setErrorMsg(`Catatan pemeriksaan untuk ${r.memberName} di bulan ${r.bulan} masih kosong.`);
        return;
      }
      if (!r.fotoKegiatan) {
        setErrorMsg(`Foto Kegiatan untuk ${r.memberName} di bulan ${r.bulan} wajib dilampirkan.`);
        return;
      }
      if (!r.fotoFormulir) {
        setErrorMsg(`Foto Formulir Kesehatan/KIA untuk ${r.memberName} di bulan ${r.bulan} wajib dilampirkan.`);
        return;
      }
    }

    const confirmed = window.confirm(
      isAdminLoggedIn
        ? `Apakah Anda yakin ingin mengirimkan sebanyak ${reports.length} laporan verifikasi komitmen?\n\nData akan dikirimkan secara langsung ke database Google Sheets & folder bukti Google Drive Anda.`
        : `Apakah Anda yakin ingin mengirimkan sebanyak ${reports.length} laporan verifikasi komitmen secara mandiri?\n\nLaporan Anda akan diunggah ke Antrean Verifikasi Cloud Firestore. Admin akan menyetujui dan memindahkannya ke database Google Sheets utama.`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setSubmitProgress({ current: 0, total: reports.length });

    try {
      if (!onAddBatch) {
        throw new Error('Metode pengiriman batch database belum siap.');
      }

      // Prepare payload schema congruent with PKHRecord
      const payload = reports.map((r) => {
        return {
          recordData: {
            tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
            namaKpm: namaKpm,
            nikKpm: noKkVerified,
            kategori: r.kategori,
            namaSasaran: r.memberName,
            keterangan: r.catatan,
            emailPelapor: isAdminLoggedIn ? userEmail : 'kpm.mandiri@pkhsehat.id',
            triwulan: selectedTriwulan,
            bulanPelaporan: r.bulan,
            tanggalCatatan: r.tanggalCatatan,
          },
          fotoKegiatan: r.fotoKegiatan,
          fotoFormulir: r.fotoFormulir,
        };
      });

      // Submit loop processed smoothly inside helper
      await onAddBatch(payload);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kendala saat mengunggah foto / menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm animate-fade-in" id="submission-success">
        <div className="w-16 h-16 bg-indigo-50 border border-indigo-150 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pelaporan Mandiri Berhasil!</h2>
        <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
          {isAdminLoggedIn ? (
            <>
              Sebanyak <strong>{reports.length} laporan bulanan</strong> dari keluarga <strong>{namaKpm}</strong> ({selectedTriwulan}) berhasil diunggah langsung ke Spreadsheet utama dan berkas foto tersimpan dengan aman di folder Drive pribadi Anda.
            </>
          ) : (
            <>
              Terima kasih! Sebanyak <strong>{reports.length} laporan bulanan</strong> dari keluarga <strong>{namaKpm}</strong> ({selectedTriwulan}) berhasil dikirim ke <strong>Antrean Verifikasi Admin</strong>. Admin (androsendy@gmail.com) akan segera menyetujui dan memindahkannya ke Google Sheets & Google Drive utama secara terpusat.
            </>
          )}
        </p>
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => {
              setStep(1);
              setNoKkInput('');
              setSearched(false);
              setSuccess(false);
              setReports([]);
              setMembers([]);
            }}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-wider"
          >
            Lapor Keluarga Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden max-w-4xl mx-auto" id="report-wizard">
      {/* Step Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-widest leading-none">Form Penerima PKH</span>
          <h2 className="text-sm font-bold text-slate-800 mt-1">
            {step === 1 && "Langkah 1: Verifikasi KK & Trimester"}
            {step === 2 && "Langkah 2: Isi Nama Anggota Komponen Kesehatan"}
            {step === 3 && `Langkah 3: Pengisian Formulir Laporan (${reports.length} Baris)`}
          </h2>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        </div>
      </div>

      <div className="p-6">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-150 rounded-lg text-xs text-red-600 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* ==================================== STEP 1 ==================================== */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in" id="step1-container">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pencarian Nomor Kartu Keluarga (KK)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Masukkan 16 digit No KK"
                  value={noKkInput}
                  onChange={(e) => setNoKkInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSearchKK}
                  className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari KK
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Pencarian ini menelusuri data KK yang tersinkron dalam database PKH Sehat. Pelaporan hanya diperbolehkan bagi Nomor KK yang resmi terdaftar.
              </p>
            </div>

            {searched && familyFound && selectedFamily && (
              <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-xl space-y-5 animate-fade-in">
                <div className="flex gap-2 items-center text-xs font-bold">
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    Sistem Verifikasi: Data Keluarga PKH Ditemukan dan Valid
                  </span>
                </div>

                {/* 13-Field Official Family Profile Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">ID DATABASE KPM</span>
                      <span className="text-[11px] font-black text-indigo-700 font-mono italic">{selectedFamily.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                        Status PKH: {selectedFamily.statusPkh}
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded font-mono">
                        {selectedFamily.jumlahAnggota} Anggota Keluarga
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nama Lengkap (KPM)</span>
                        <span className="text-slate-800 font-extrabold text-sm">{selectedFamily.nama}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Alamat Tempat Tinggal</span>
                        <span className="text-slate-700 leading-relaxed">{selectedFamily.alamat}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">RT</span>
                          <span className="text-slate-700 font-mono">{selectedFamily.rt}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">RW</span>
                          <span className="text-slate-700 font-mono">{selectedFamily.rw}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kecamatan</span>
                          <span className="text-slate-700 font-bold">{selectedFamily.kecamatan}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Desa / Kelurahan</span>
                          <span className="text-slate-700 font-bold">{selectedFamily.desa}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 md:border-l md:border-slate-100 md:pl-4">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nomor Kartu Keluarga (KK)</span>
                        <span className="text-slate-850 font-mono font-black tracking-wide text-sm">{selectedFamily.noKk}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pendamping Sosial</span>
                        <span className="text-indigo-650 font-bold">{selectedFamily.pendamping}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Komponen Terdaftar:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedFamily.ibuHamil > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                              Ibu Hamil: {selectedFamily.ibuHamil}
                            </span>
                          )}
                          {selectedFamily.balita > 0 && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                              Balita: {selectedFamily.balita}
                            </span>
                          )}
                          {selectedFamily.lansia > 0 && (
                            <span className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md">
                              Lansia: {selectedFamily.lansia}
                            </span>
                          )}
                          {selectedFamily.disabilitas > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                              Disabilitas: {selectedFamily.disabilitas}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selection of report parameters (Trimester) */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl max-w-md">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Pilih Periode Triwulan Pelaporan Mandiri
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTriwulan}
                      onChange={(e) => setSelectedTriwulan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-xs font-bold appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
                    >
                      <option value="Triwulan I">Triwulan I (Januari - Maret)</option>
                      <option value="Triwulan II">Triwulan II (April - Juni)</option>
                      <option value="Triwulan III">Triwulan III (Juli - September)</option>
                      <option value="Triwulan IV">Triwulan IV (Oktober - Desember)</option>
                    </select>
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Aggregate Component Setters */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Agregat Jumlah Komponen Kesehatan yang Aktif :
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'Ibu Hamil', icon: Heart, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                      { key: 'Balita', icon: Baby, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                      { key: 'Lansia', icon: Users, color: 'text-pink-500 bg-pink-50 border-pink-100 font-bold' },
                      { key: 'Disabilitas', icon: ShieldAlert, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
                    ].map((comp) => {
                      const Icon = comp.icon;
                      return (
                        <div key={comp.key} className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs flex flex-col justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={`p-1.5 rounded-lg border flex items-center justify-center ${comp.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">{comp.key}</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 gap-2">
                            <button
                              type="button"
                              disabled={familyFound}
                              onClick={() => {
                                setKomponenCounts((prev) => ({
                                  ...prev,
                                  [comp.key]: Math.max(0, prev[comp.key] - 1)
                                }));
                              }}
                              className="w-6 h-6 bg-slate-100 text-slate-600 font-bold rounded flex items-center justify-center md:hover:bg-slate-200 cursor-pointer text-xs disabled:opacity-40 select-none"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-slate-800">{komponenCounts[comp.key]}</span>
                            <button
                              type="button"
                              disabled={familyFound}
                              onClick={() => {
                                setKomponenCounts((prev) => ({
                                  ...prev,
                                  [comp.key]: prev[comp.key] + 1
                                }));
                              }}
                              className="w-6 h-6 bg-slate-100 text-slate-600 font-bold rounded flex items-center justify-center md:hover:bg-slate-200 cursor-pointer text-xs disabled:opacity-40 select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {familyFound && (
                    <span className="block text-[10px] text-slate-400 mt-2 font-medium italic">
                      * Agregat komponen dinonaktifkan karena data keluarga sudah tersimpan di database.
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-150 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all uppercase tracking-wider"
                  >
                    Lanjutkan ke Langkah 2
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================== STEP 2 ==================================== */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in" id="step2-container">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">KPM Penerima</span>
              <h3 className="text-xs font-bold text-slate-900 mt-0.5">{namaKpm} (KK: {noKkVerified})</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Keluarga Anda mengampu total aktif komponen: {Object.entries(komponenCounts).filter(([_, c]) => (c as number) > 0).map(([k, c]) => `${c} ${k}`).join(', ')}.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Entri Nama Anggota Komponen Kesehatan</h4>
                <p className="text-[10.5px] text-slate-500 leading-normal">
                  Ketikkan nama lengkap dari anggota keluarga yang memegang masing-masing komponen kesehatan:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map((member, i) => (
                  <div key={member.index} className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded capitalize">
                        Anggota {i + 1}: {member.kategori}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Nama Lengkap Anggota
                      </label>
                      <input
                        type="text"
                        placeholder={`Masukkan nama ${member.kategori}`}
                        value={member.nama}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMembers((prev) => 
                            prev.map((m) => m.index === member.index ? { ...m, nama: val } : m)
                          );
                        }}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 pointer-events-auto"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all uppercase tracking-wider cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Kembali
              </button>
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-5 py-2.5 text-xs font-bold rounded-lg hover:bg-slate-800 transition-all uppercase tracking-wider cursor-pointer"
              >
                Buat Baris Laporan Bulanan
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================== STEP 3 ==================================== */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in" id="step3-container">
            {isSubmitting ? (
              <div className="p-12 text-center space-y-4 shadow-inner bg-slate-50 border border-slate-200 rounded-2xl">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Mengunggah Laporan ke Server...</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Harap tunggu, data sedang diunggah. Kami sedang melampirkan file foto ke folder Google Drive {submitProgress.current + 1}/{submitProgress.total} dan mengamankan baris data Anda pada spreadsheet PKH_Kesehatan_Database...
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2 max-w-xs mx-auto overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(submitProgress.current / submitProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Nama KPM & No KK</span>
                    <strong className="text-slate-900 text-xs">{namaKpm} - {noKkVerified}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase text-right sm:text-left">Target Triwulan</span>
                    <strong className="text-indigo-600 text-xs text-right sm:text-left block">{selectedTriwulan} ({TRIWULAN_MONTHS[selectedTriwulan]?.join(', ')})</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase text-right">Skala</span>
                    <strong className="text-slate-900 text-xs block text-right">
                      {members.length} Anggota × 3 Bulan = {reports.length} Baris laporan
                    </strong>
                  </div>
                </div>

                <div className="space-y-6">
                  {reports.map((report, idx) => (
                    <div key={report.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex flex-wrap md:flex-nowrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono flex items-center justify-center text-xs font-bold font-mono">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-slate-800">
                              {report.memberName} <span className="text-slate-400 font-medium">({report.kategori})</span>
                            </h4>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                              Laporan Bulan: {report.bulan}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            Tanggal Catatan:
                          </span>
                          <input
                            type="date"
                            value={report.tanggalCatatan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReports((prev) => 
                                prev.map((rep) => rep.id === report.id ? { ...rep, tanggalCatatan: val } : rep)
                              );
                            }}
                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] font-medium text-slate-700 pointer-events-auto"
                          />
                        </div>
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Text note input */}
                        <div className="md:col-span-6 space-y-2">
                          <label className="block text-[10px] text-slate-400 font-bold uppercase">
                            Catatan Catatan Perkembangan / Verifikasi Kesehatan
                          </label>
                          <textarea
                            placeholder="Contoh: Berat badan stabil, imunisasi polio lengkap, sehat jasmani."
                            value={report.catatan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReports((prev) => 
                                prev.map((rep) => rep.id === report.id ? { ...rep, catatan: val } : rep)
                              );
                            }}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs leading-relaxed font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 pointer-events-auto"
                          />
                        </div>

                        {/* File Upload 1: Foto Kegiatan */}
                        <div className="md:col-span-3 space-y-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
                          <label className="block text-[10px] text-slate-400 font-bold uppercase">
                            Foto Kegiatan Layanan
                          </label>
                          {report.fotoKegiatanPreview ? (
                            <div className="relative aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center group">
                              <img 
                                src={report.fotoKegiatanPreview} 
                                alt="Pratinjau Kegiatan" 
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setReports((prev) => 
                                    prev.map((rep) => rep.id === report.id ? { ...rep, fotoKegiatan: null, fotoKegiatanPreview: null } : rep)
                                  );
                                }}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded p-1 hover:bg-red-700 pointer-events-auto text-[10px] px-1.5 py-0.5 font-bold cursor-pointer"
                              >
                                Ganti
                              </button>
                            </div>
                          ) : (
                            <label className="aspect-video rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center p-3 text-center cursor-pointer pointer-events-auto selection:bg-indigo-200">
                              <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-600 block leading-tight">Unggah Foto</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Bukti kegiatan</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileSlot(report.id, 'kegiatan', e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* File Upload 2: Foto Formulir Kesehatan */}
                        <div className="md:col-span-3 space-y-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
                          <label className="block text-[10px] text-slate-400 font-bold uppercase">
                            Foto Buku KIA / Formulir Sehat
                          </label>
                          {report.fotoFormulirPreview ? (
                            <div className="relative aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center group">
                              <img 
                                src={report.fotoFormulirPreview} 
                                alt="Pratinjau Formulir" 
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setReports((prev) => 
                                    prev.map((rep) => rep.id === report.id ? { ...rep, fotoFormulir: null, fotoFormulirPreview: null } : rep)
                                  );
                                }}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded p-1 hover:bg-red-700 pointer-events-auto text-[10px] px-1.5 py-0.5 font-bold cursor-pointer"
                              >
                                Ganti
                              </button>
                            </div>
                          ) : (
                            <label className="aspect-video rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center p-3 text-center cursor-pointer pointer-events-auto selection:bg-indigo-200">
                              <FileText className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-600 block leading-tight">Unggah Formulir</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Dokumen posyandu</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileSlot(report.id, 'formulir', e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-200 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitBatch}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-6 py-3 text-xs font-black rounded-lg hover:bg-indigo-700 transition-all shadow-md uppercase tracking-widest cursor-pointer active:scale-95"
                  >
                    Kirim Semua Laporan ({reports.length} Baris)
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
