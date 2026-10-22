# LMS Pintar & CBT Live Monitor (Mister Irham LMS)

Platform Learning Management System (LMS) modern dan sistem ujian berbasis komputer (CBT) real-time dengan pemantauan langsung aktivitas siswa via WebSocket.

---

## 🌟 Fitur Utama

- **Role Management**: Multi-user support untuk Admin, Guru, dan Siswa.
- **CBT Real-Time Live Monitor**: Pengawas ujian dapat memantau status pengerjaan, peringatan kecurangan (tab switch, fullscreen exit), sisa waktu, dan skor secara langsung.
- **Bank Soal & Ujian CBT**: Pengelolaan bank soal lengkap dengan kategori, bobot nilai, kunci jawaban, dan pembahasan.
- **Presensi & Jurnal Mengajar**: Pencatatan kehadiran digital dan riwayat jurnal harian guru.
- **Pengelolaan Tugas & Nilai**: Pembagian tugas terstruktur serta rekap nilai akademik.
- **Fast & Lightweight Database**: Didukung SQLite via `better-sqlite3` dengan WAL mode untuk performa optimal tanpa konfigurasi DB server rumit.

---

## 🚀 Teknologi yang Digunakan

- **Backend**:
  - Node.js & Express.js
  - Socket.io (Real-time updates)
  - better-sqlite3 (High-performance SQLite engine)
  - JWT (JSON Web Tokens) & bcryptjs
- **Frontend**:
  - React 19 + Vite
  - Lucide React (Modern Icons)
  - Socket.io Client
  - Canvas Confetti

---

## 💻 Cara Menjalankan Project

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 ke atas)
- npm

### 2. Instalasi Dependensi
Jalankan perintah berikut di direktori root project:

```bash
# Install dependensi backend
npm install

# Install dependensi frontend
cd client
npm install
cd ..
```

### 3. Menjalankan Aplikasi (Development)
Untuk menjalankan backend server dan frontend client secara bersamaan:

```bash
npm run dev
```

Aplikasi dapat diakses melalui browser:
- **Frontend (Vite)**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🔑 Akun Bawaan (Default Seed Users)

Saat server pertama kali dijalankan, sistem otomatis membuat akun starter berikut:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Guru** | `guru1` | `guru123` |
| **Siswa** | `siswa1` | `siswa123` |

---

## 📄 Lisensi
ISC
