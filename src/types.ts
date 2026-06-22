export interface PKHRecord {
  id: string;
  tanggal: string;
  namaKpm: string;
  nikKpm: string; // Used both as NIK KPM or No KK
  kategori: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
  namaSasaran: string; // Nama Anggota
  usia?: number;
  beratBadan?: number;
  tinggiBadan?: number;
  imunisasiKia?: 'Ya' | 'Tidak';
  vitaminSuplemen?: 'Ya' | 'Tidak';
  namaFaskes?: string;
  keterangan: string; // Catatan
  linkFoto: string; // Link Foto Kegiatan
  idFotoDrive: string;
  linkFotoFormulir?: string; // Link Foto Formulir Kesehatan
  idFotoFormulirDrive?: string;
  emailPelapor: string;
  triwulan?: string;
  bulanPelaporan?: string;
  tanggalCatatan?: string;
}

export interface DashboardStats {
  totalLaporan: number;
  totalKpm: number;
  persentaseBalita: number;
  persentaseIbuHamil: number;
  kepatuhanImunisasi: number; // %
  kepatuhanVitamin: number; // %
  averageBeratBalita: number;
  averageTinggiBalita: number;
}

export interface Family {
  id: string;
  noKk: string;
  nama: string;
  alamat: string;
  rt: string;
  rw: string;
  kecamatan: string;
  desa: string;
  ibuHamil: number;
  balita: number;
  lansia: number;
  disabilitas: number;
  jumlahAnggota: number;
  pendamping: string;
  statusPkh: string;
}

