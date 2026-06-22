import { useState, useMemo } from 'react';
import { 
  PKHRecord 
} from '../types';
import { 
  Search, 
  Baby, 
  Heart, 
  Calendar, 
  MapPin, 
  Tag, 
  FileImage, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface RecordHistoryProps {
  records: PKHRecord[];
  spreadsheetId: string | null;
}

export default function RecordHistory({ records, spreadsheetId }: RecordHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas'>('Semua');

  // Filtered lists
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch = 
        r.namaKpm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.nikKpm.includes(searchTerm) ||
        r.namaSasaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.triwulan && r.triwulan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.bulanPelaporan && r.bulanPelaporan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.kategori.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = 
        categoryFilter === 'Semua' || 
        r.kategori === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [records, searchTerm, categoryFilter]);

  // Formats dating format into beautiful Indonesian style
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [datePart] = dateStr.split(' ');
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      
      const monNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
        'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      
      return `${day} ${monNames[monthIndex] || parts[1]} ${year}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="history-view">
      {/* Upper header action log */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Riwayat Pelaporan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar lengkap seluruh laporan verifikasi komitmen kesehatan yang telah disinkronkan ke Google Sheet database.
          </p>
        </div>
        
        {spreadsheetId && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            Buka Google Sheet Utama
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Filter and search controllers */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search bar */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-4.5 h-4.5 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Cari Nama KPM, No KK, Anggota, Triwulan, Bulan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2+0.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Tab category pills */}
        <div className="flex flex-wrap gap-1 bg-slate-100 border border-slate-200 p-1 rounded-lg">
          {(['Semua', 'Ibu Hamil', 'Balita', 'Lansia', 'Disabilitas'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Record elements representation */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecords.map((record) => (
            <div 
              key={record.id} 
              className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-400 hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Category card badge in upper right */}
              <div className="absolute top-4 right-4">
                {record.kategori === 'Ibu Hamil' && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-100">
                    <Heart className="w-3.5 h-3.5 text-amber-500" />
                    Ibu Hamil
                  </span>
                )}
                {record.kategori === 'Balita' && (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">
                    <Baby className="w-3.5 h-3.5 text-indigo-505" />
                    Balita
                  </span>
                )}
                {record.kategori === 'Lansia' && (
                  <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-pink-100">
                    <Users className="w-3.5 h-3.5 text-pink-500" />
                    Lansia
                  </span>
                )}
                {record.kategori === 'Disabilitas' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Disabilitas
                  </span>
                )}
              </div>

              <div>
                {/* ID and Period Badge */}
                <div className="flex gap-1.5 items-center">
                  <span className="text-[9px] font-mono text-slate-400 font-bold tracking-wider bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                    {record.id}
                  </span>
                  {record.triwulan && (
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                      {record.triwulan} - {record.bulanPelaporan}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatIndoDate(record.tanggal || record.tanggalCatatan || '')}</span>
                </div>

                {/* Main profile */}
                <div className="mt-2.5">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-sm">KPM: {record.namaKpm}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">No KK: {record.nikKpm}</p>
                </div>

                {/* Sasaran detail checkup info */}
                <div className="mt-3.5 bg-slate-50 border border-slate-100 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nama Anggota:</span>
                    <span className="font-bold text-slate-800">{record.namaSasaran}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Komponen Kesehatan:</span>
                    <span className="font-bold text-indigo-600 uppercase text-[10px] tracking-wider">{record.kategori}</span>
                  </div>
                  {record.tanggalCatatan && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Tgl Periksa/Catatan:</span>
                      <span className="font-mono text-slate-705 text-[11px] font-bold">{formatIndoDate(record.tanggalCatatan)}</span>
                    </div>
                  )}
                </div>

                {/* Additional Info / Note */}
                {record.keterangan && (
                  <div className="mt-3 p-2.5 bg-slate-50/50 rounded-lg border-l-2 border-indigo-500">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Catatan Perkembangan:</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {record.keterangan}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom properties (Facility reporter name and Photo Links) */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[120px] font-medium">{record.emailPelapor}</span>
                </div>

                <div className="flex gap-1.5">
                  {record.linkFoto ? (
                    <a
                      href={record.linkFoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-150 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <FileImage className="w-3 h-3" />
                      Kegiatan
                    </a>
                  ) : (
                    <span className="text-[9px] text-slate-400 italic">No Foto</span>
                  )}

                  {record.linkFotoFormulir ? (
                    <a
                      href={record.linkFotoFormulir}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 px-2 py-1 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      Formulir
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-xl flex flex-col items-center shadow-xs">
          <AlertCircle className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-900">Laporan Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm font-medium">
            Tidak ada data verifikasi komitmen kesehatan PKH yang cocok dengan pencarian Anda. Pastikan kata kunci benar atau ubah pil filter kategori.
          </p>
        </div>
      )}
    </div>
  );
}
