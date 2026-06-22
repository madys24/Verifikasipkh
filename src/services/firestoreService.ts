import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Family } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// -----------------------------------------------------
// REGISTERED FAMILIES DATABASE MANAGEMENT (FIRESTORE)
// -----------------------------------------------------

// Fetch all registered families from Firestore
export const fetchRegisteredFamilies = async (): Promise<Family[]> => {
  try {
    const collRef = collection(db, 'pkh_registered_families');
    const snapshot = await getDocs(collRef);
    const list: Family[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        noKk: data.noKk || '',
        nama: data.nama || '',
        alamat: data.alamat || '',
        rt: data.rt || '',
        rw: data.rw || '',
        kecamatan: data.kecamatan || '',
        desa: data.desa || '',
        ibuHamil: Number(data.ibuHamil) || 0,
        balita: Number(data.balita) || 0,
        lansia: Number(data.lansia) || 0,
        disabilitas: Number(data.disabilitas) || 0,
        jumlahAnggota: Number(data.jumlahAnggota) || 0,
        pendamping: data.pendamping || '',
        statusPkh: data.statusPkh || 'Aktif',
      });
    });
    return list;
  } catch (error) {
    console.error('Fetch registered families failed: ', error);
    return [];
  }
};

// Add or Update a single family
export const saveFamilyToFirestore = async (family: Family) => {
  try {
    const docRef = doc(db, 'pkh_registered_families', family.id || `KPM-${Date.now()}`);
    await setDoc(docRef, {
      noKk: family.noKk,
      nama: family.nama,
      alamat: family.alamat,
      rt: family.rt,
      rw: family.rw,
      kecamatan: family.kecamatan,
      desa: family.desa,
      ibuHamil: Number(family.ibuHamil) || 0,
      balita: Number(family.balita) || 0,
      lansia: Number(family.lansia) || 0,
      disabilitas: Number(family.disabilitas) || 0,
      jumlahAnggota: Number(family.jumlahAnggota) || 0,
      pendamping: family.pendamping,
      statusPkh: family.statusPkh,
    });
  } catch (error) {
    console.error('Save family failed: ', error);
    throw error;
  }
};

// Clear and batch seed target registered families
export const seedFamiliesToFirestore = async (families: Family[]) => {
  try {
    const batch = writeBatch(db);
    families.forEach((fam) => {
      const docRef = doc(db, 'pkh_registered_families', fam.id);
      batch.set(docRef, {
        noKk: fam.noKk,
        nama: fam.nama,
        alamat: fam.alamat,
        rt: fam.rt,
        rw: fam.rw,
        kecamatan: fam.kecamatan,
        desa: fam.desa,
        ibuHamil: Number(fam.ibuHamil) || 0,
        balita: Number(fam.balita) || 0,
        lansia: Number(fam.lansia) || 0,
        disabilitas: Number(fam.disabilitas) || 0,
        jumlahAnggota: Number(fam.jumlahAnggota) || 0,
        pendamping: fam.pendamping,
        statusPkh: fam.statusPkh,
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('Seed families failed: ', error);
    throw error;
  }
};

// Delete a registered family
export const deleteFamilyFromFirestore = async (familyId: string) => {
  try {
    const docRef = doc(db, 'pkh_registered_families', familyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Delete family failed: ', error);
    throw error;
  }
};

export interface PendingReport {
  id?: string;
  namaKpm: string;
  nikKpm: string; // No KK
  kategori: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
  namaSasaran: string; // Nama Anggota
  tanggal: string; // Tanggal input
  triwulan: string;
  bulanPelaporan: string;
  tanggalCatatan: string;
  keterangan: string; // Catatan
  fotoKegiatanBase64: string; // Compressed Base64 image
  fotoFormulirBase64: string; // Compressed Base64 image
  emailPelapor: string;
  createdAt?: any;
}

// 1. Submit a KPM report to firestore queue
export const saveReportToQueue = async (report: PendingReport) => {
  try {
    const collRef = collection(db, 'pkh_pending_reports');
    await addDoc(collRef, {
      ...report,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Save to Firestore queue failed: ', error);
    throw error;
  }
};

// 2. Retrieve all pending reports from queue
export const fetchPendingQueue = async (): Promise<PendingReport[]> => {
  try {
    const collRef = collection(db, 'pkh_pending_reports');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const list: PendingReport[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        namaKpm: data.namaKpm || '',
        nikKpm: data.nikKpm || '',
        kategori: data.kategori || 'Balita',
        namaSasaran: data.namaSasaran || '',
        tanggal: data.tanggal || '',
        triwulan: data.triwulan || '',
        bulanPelaporan: data.bulanPelaporan || '',
        tanggalCatatan: data.tanggalCatatan || '',
        keterangan: data.keterangan || '',
        fotoKegiatanBase64: data.fotoKegiatanBase64 || '',
        fotoFormulirBase64: data.fotoFormulirBase64 || '',
        emailPelapor: data.emailPelapor || '',
      });
    });
    return list;
  } catch (error) {
    console.error('Fetch firestore queue failed: ', error);
    return [];
  }
};

// 3. Delete a report after successful sheet/drive sync
export const deleteFromQueue = async (reportId: string) => {
  try {
    const docRef = doc(db, 'pkh_pending_reports', reportId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Delete from Firestore queue failed: ', error);
    throw error;
  }
};

// 4. Utility image compressor
export const compressImage = (file: File, maxW = 1024, maxH = 1024, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          reject(new Error('Canvas context fail'));
        }
      };
      img.onerror = () => reject(new Error('Gagal memuat visual gambar'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca data file'));
    reader.readAsDataURL(file);
  });
};

// Converts base64 file string to a standard File object
export const base64ToFile = (base64String: string, filename: string): File => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};
