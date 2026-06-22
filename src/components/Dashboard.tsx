import { useState, useMemo } from 'react';
import { PKHRecord } from '../types';
import { 
  FileText, 
  Image as ImageIcon, 
  UserCheck, 
  Calendar, 
  Tag, 
  ExternalLink,
  Search,
  Filter,
  Layers,
  ZoomIn,
  Smile,
  Users2,
  FileSpreadsheet,
  FileImage,
  Inbox
} from 'lucide-react';

interface DashboardProps {
  records: PKHRecord[];
}

export default function Dashboard({ records }: DashboardProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTriwulan, setSelectedTriwulan] = useState<string>('Semua');

  // Lightbox Image Viewer
  const [activeLightbox, setActiveLightbox] = useState<{ url: string; title: string } | null>(null);

  // Helper: Extract & generate direct high-performing thumbnail link from Google Drive File ID
  const getDriveThumbnail = (fileId: string | undefined, fallbackLink: string | undefined) => {
    if (fileId && fileId.trim().length > 5) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    if (fallbackLink) {
      const match = fallbackLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return '';
  };

  // Safe Date Formatting
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // 1. Calculate focused visual statistics
  const stats = useMemo(() => {
    const total = records.length;
    let withKegiatan = 0;
    let withFormulir = 0;
    const uniqueKpm = new Set<string>();

    records.forEach((r) => {
      if (r.idFotoDrive || r.linkFoto) withKegiatan++;
      if (r.idFotoFormulirDrive || r.linkFotoFormulir) withFormulir++;
      if (r.nikKpm) uniqueKpm.add(r.nikKpm);
    });

    return {
      total,
      withKegiatan,
      withFormulir,
      uniqueKpmCount: uniqueKpm.size,
    };
  }, [records]);

  // 2. Filter records according to admin controls
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search matching
      const s = searchQuery.toLowerCase();
      const matchSearch = 
        r.namaKpm.toLowerCase().includes(s) ||
        r.namaSasaran.toLowerCase().includes(s) ||
        r.nikKpm.toLowerCase().includes(s) ||
        (r.keterangan && r.keterangan.toLowerCase().includes(s));

      // Category filter matching
      const matchCategory = selectedCategory === 'Semua' || r.kategori === selectedCategory;

      // Triwulan filter matching
      const matchTriwulan = selectedTriwulan === 'Semua' || r.triwulan === selectedTriwulan;

      return matchSearch && matchCategory && matchTriwulan;
    });
  }, [records, searchQuery, selectedCategory, selectedTriwulan]);

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-view">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Pemantauan Bukti Laporan KPM Mandiri
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dasbor audit visual untuk memeriksa foto kegiatan posyandu dan foto lembar sehat/KIA yang diunggah langsung oleh keluarga Penerima Manfaat.
          </p>
        </div>
      </div>

      {/* Visual Counters - Tailored strictly to photos & notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 bg-indigo-50 rounded-full w-20 h-20 transition-all group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 z-10">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Record Data</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.total} Baris</span>
            </div>
          </div>
        </div>

        {/* Total KPM Families */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 bg-emerald-50 rounded-full w-20 h-20 transition-all group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 z-10">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Keluarga KPM</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.uniqueKpmCount} No. KK</span>
            </div>
          </div>
        </div>

        {/* Activity Photos */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 bg-blue-50 rounded-full w-20 h-20 transition-all group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 z-10">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Foto Kegiatan</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.withKegiatan} Berkas</span>
            </div>
          </div>
        </div>

        {/* KIA / Verification Sheet Photos */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 bg-pink-50 rounded-full w-20 h-20 transition-all group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-50 rounded-lg text-pink-600 z-10">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Foto Form KIA</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.withFormulir} Berkas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Filtering Toolbox */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama keluarga KPM, KK, sasaran, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-48 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Kategori:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold p-2 rounded-lg text-xs"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Ibu Hamil">Ibu Hamil</option>
            <option value="Balita">Balita</option>
            <option value="Lansia">Lansia</option>
            <option value="Disabilitas">Disabilitas</option>
          </select>
        </div>

        {/* Period Filter */}
        <div className="w-full md:w-48 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Triwulan:</span>
          <select
            value={selectedTriwulan}
            onChange={(e) => setSelectedTriwulan(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold p-2 rounded-lg text-xs"
          >
            <option value="Semua">Semua Periode</option>
            <option value="Triwulan I">Triwulan I</option>
            <option value="Triwulan II">Triwulan II</option>
            <option value="Triwulan III">Triwulan III</option>
            <option value="Triwulan IV">Triwulan IV</option>
          </select>
        </div>
      </div>

      {/* Main Photographic Feed */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((item) => {
            const hasKegiatan = item.idFotoDrive || item.linkFoto;
            const hasForm = item.idFotoFormulirDrive || item.linkFotoFormulir;
            const imgKegiatanUrl = getDriveThumbnail(item.idFotoDrive, item.linkFoto);
            const imgFormUrl = getDriveThumbnail(item.idFotoFormulirDrive, item.linkFotoFormulir);

            return (
              <div 
                key={item.id || `${item.nikKpm}-${item.tanggal}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Header Information */}
                <div className="p-4 border-b border-slate-100 space-y-1 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5">
                      {item.kategori}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">
                      {formatIndoDate(item.tanggal)}
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-slate-900 truncate mt-1">
                    {item.namaSasaran} <span className="text-[10px] font-normal text-slate-500">(Keluarga {item.namaKpm})</span>
                  </h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>KK: <strong className="font-mono">{item.nikKpm}</strong></span>
                    {item.triwulan && item.bulanPelaporan && (
                      <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {item.triwulan} - {item.bulanPelaporan}
                      </span>
                    )}
                  </div>
                </div>

                {/* Proof Photos Side-by-Side Area */}
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Photo 1: Kegiatan */}
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-bold text-slate-500 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-indigo-500" />
                        Foto Kegiatan
                      </span>
                      {hasKegiatan ? (
                        <div className="relative aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden group cursor-pointer">
                          <img 
                            src={imgKegiatanUrl} 
                            alt="Foto Kegiatan KPM" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If Google lh3 gets blocked or fails, show direct message
                              (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80';
                            }}
                          />
                          <button 
                            onClick={() => setActiveLightbox({ url: imgKegiatanUrl, title: `Foto Kegiatan - ${item.namaSasaran}` })}
                            className="absolute inset-0 bg-slate-905/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video bg-slate-100 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-4 h-4 mb-1 opacity-40" />
                          <span className="text-[9px]">Tidak ada foto</span>
                        </div>
                      )}

                      {item.linkFoto && (
                        <a
                          href={item.linkFoto}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-650 hover:underline hover:text-indigo-800"
                        >
                          Tinjau di Drive
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Photo 2: Formulir Kesehatan / KIA */}
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-bold text-slate-500 flex items-center gap-1">
                        <FileImage className="w-3 h-3 text-pink-500" />
                        Buku KIA / Form
                      </span>
                      {hasForm ? (
                        <div className="relative aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden group cursor-pointer">
                          <img 
                            src={imgFormUrl} 
                            alt="Foto Formulir/KIA" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).src = 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200&q=80';
                            }}
                          />
                          <button 
                            onClick={() => setActiveLightbox({ url: imgFormUrl, title: `Foto KIA/Formulir - ${item.namaSasaran}` })}
                            className="absolute inset-0 bg-slate-905/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video bg-slate-100 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                          <FileImage className="w-4 h-4 mb-1 opacity-40" />
                          <span className="text-[9px]">Tidak ada foto</span>
                        </div>
                      )}

                      {item.linkFotoFormulir && (
                        <a
                          href={item.linkFotoFormulir}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[8px] font-black text-pink-650 hover:underline hover:text-pink-800"
                        >
                          Tinjau di Drive
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes & Remarks block */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Catatan Perkembangan KPM:</span>
                    {item.keterangan ? (
                      <blockquote className="text-xs text-slate-650 italic font-medium leading-relaxed bg-indigo-50/40 p-2.5 border-l-2 border-indigo-400 rounded-r-lg">
                        "{item.keterangan}"
                      </blockquote>
                    ) : (
                      <p className="text-xs italic text-slate-400 leading-normal bg-slate-50 p-2.5 rounded-lg">
                        Tidak ada catatan rincian tertulis yang disematkan dalam laporan ini.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-medium">
                    <span>Pelapor: <strong className="text-slate-600 underline font-semibold">{item.emailPelapor}</strong></span>
                    {item.tanggalCatatan && (
                      <span>Tgl KIA: {formatIndoDate(item.tanggalCatatan)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-sm mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Tidak ada Laporan Ditemukan</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Silakan coba ubah kata kunci pencarian Anda atau sesuaikan filter opsi Kategori & Triwulan periode di bagian atas.
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-[9999] animate-fade-in"
          onClick={() => setActiveLightbox(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Title / Description */}
            <div className="bg-slate-900/90 text-white p-3 rounded-t-xl flex justify-between items-center text-xs font-bold">
              <span>{activeLightbox.title}</span>
              <button 
                onClick={() => setActiveLightbox(null)}
                className="bg-slate-805 hover:bg-slate-700 font-extrabold px-2.5 py-1 rounded cursor-pointer text-sm"
              >
                × Close
              </button>
            </div>
            
            {/* Image Box */}
            <div className="bg-white p-2 rounded-b-xl overflow-auto flex items-center justify-center min-h-[300px]">
              <img 
                src={activeLightbox.url} 
                alt="Audit visual PKH" 
                className="max-w-full max-h-[70vh] object-contain rounded-md"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
