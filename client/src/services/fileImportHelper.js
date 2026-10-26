import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

// ========================================================
// 1. DATA SISWA - EXCEL TEMPLATE & PARSER
// ========================================================

/**
 * Generate and download Excel template for student import
 */
export function downloadStudentExcelTemplate() {
  const sampleData = [
    {
      'Nama Lengkap': 'Achmad Zakky Fanani',
      'NIS': '0111956420',
      'Kelas': 'X-8',
      'Jenis Kelamin': 'L',
      'Username': '0111956420',
      'Password': 'password123',
      'Email': '0111956420@siswa.sekolah.sch.id',
      'No HP': '081234567890'
    },
    {
      'Nama Lengkap': 'Afiqah Liyana Zahira',
      'NIS': '0118373709',
      'Kelas': 'X-8',
      'Jenis Kelamin': 'P',
      'Username': '0118373709',
      'Password': 'password123',
      'Email': '0118373709@siswa.sekolah.sch.id',
      'No HP': '081234567891'
    },
    {
      'Nama Lengkap': 'Ata Rayya Andromeda',
      'NIS': '0101992863',
      'Kelas': 'X-8',
      'Jenis Kelamin': 'L',
      'Username': '0101992863',
      'Password': 'password123',
      'Email': '0101992863@siswa.sekolah.sch.id',
      'No HP': '081234567892'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Column widths
  worksheet['!cols'] = [
    { wch: 26 }, // Nama Lengkap
    { wch: 12 }, // NIS
    { wch: 14 }, // Kelas
    { wch: 16 }, // Jenis Kelamin (L/P)
    { wch: 18 }, // Username
    { wch: 16 }, // Password
    { wch: 30 }, // Email
    { wch: 16 }  // No HP
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, 'Template_Import_Siswa_EduSmart.xlsx');
}

/**
 * Parse uploaded Excel file for student data
 */
export async function parseStudentExcel(file, defaultClass = '') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('File Excel kosong atau tidak memiliki data.');
        }

        const parsedStudents = rawRows.map((row, idx) => {
          // Normalize column headers
          const getVal = (keys) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(
                col => col.trim().toLowerCase() === k.toLowerCase()
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                return String(row[foundKey]).trim();
              }
            }
            return '';
          };

          const name = getVal(['Nama Lengkap', 'Nama', 'Name', 'Nama Siswa', 'Peserta Didik']);
          const nis = getVal(['NIS', 'NISN', 'Nomor Induk', 'No Induk', 'Nis_Nip']);
          const kelas = getVal(['Kelas', 'Class', 'Rombel', 'Tingkat']) || defaultClass;
          const rawGender = getVal(['Jenis Kelamin', 'Gender', 'JK', 'L/P', 'Kelamin', 'Sex']);
          let gender = 'L';
          if (rawGender) {
            const gUpper = rawGender.trim().toUpperCase();
            if (gUpper === 'P' || gUpper.startsWith('PEREMPUAN') || gUpper === 'FEMALE' || gUpper === 'WANITA' || gUpper === 'F') {
              gender = 'P';
            } else {
              gender = 'L';
            }
          }
          let username = getVal(['Username', 'User']);
          const password = getVal(['Password', 'Sandi', 'Kata Sandi']) || 'password123';
          let email = getVal(['Email', 'Surel', 'E-mail']);
          const phone = getVal(['No HP', 'No. HP', 'HP', 'Telepon', 'Phone', 'Whatsapp', 'No Telepon']);

          // Auto-generate username if blank
          if (!username && nis) {
            username = `siswa_${nis}`;
          } else if (!username && name) {
            username = 'siswa_' + name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
          }

          // Auto-generate email if blank
          if (!email && username) {
            email = `${username}@siswa.sekolah.sch.id`;
          }

          const isValid = Boolean(name && nis && kelas);
          const errors = [];
          if (!name) errors.push('Nama wajib diisi');
          if (!nis) errors.push('NIS wajib diisi');
          if (!kelas) errors.push('Kelas wajib diisi');

          return {
            rowNumber: idx + 2,
            name,
            nis,
            kelas,
            gender,
            username: username.toLowerCase(),
            password,
            email,
            phone,
            isValid,
            errors
          };
        });

        resolve(parsedStudents);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ========================================================
// 2. BANK SOAL - EXCEL TEMPLATE & PARSER
// ========================================================

/**
 * Generate and download Excel template for Question Bank import
 */
export function downloadQuestionExcelTemplate() {
  const sampleData = [
    {
      'Tipe Soal': 'PG',
      'Pertanyaan': 'Sistem persamaan linear tiga variabel yang memiliki tepat satu penyelesaian disebut sistem...',
      'Opsi A': 'Konsisten dan Independen',
      'Opsi B': 'Konsisten dan Dependen',
      'Opsi C': 'Inkonsisten',
      'Opsi D': 'Homogen',
      'Opsi E': 'Singular',
      'Kunci Jawaban': 'A',
      'Bobot Poin': 10,
      'Tingkat Kesulitan': 'SEDANG',
      'Topik': 'SPLTV',
      'Pembahasan': 'Sistem konsisten dan independen memiliki tepat satu penyelesaian (titik temu unik).'
    },
    {
      'Tipe Soal': 'PG',
      'Pertanyaan': 'Jika x + y + z = 6, x - y + z = 2, dan 2x + y - z = 3, maka nilai dari x adalah...',
      'Opsi A': '1',
      'Opsi B': '2',
      'Opsi C': '3',
      'Opsi D': '4',
      'Opsi E': '5',
      'Kunci Jawaban': 'A',
      'Bobot Poin': 10,
      'Tingkat Kesulitan': 'MUDAH',
      'Topik': 'SPLTV',
      'Pembahasan': 'Eliminasi persamaan 1 dan 2 menghasilkan 2y = 4 => y = 2. Substitusi ke pers lainnya menghasilkan x = 1.'
    },
    {
      'Tipe Soal': 'ESAI',
      'Pertanyaan': 'Jelaskan perbedaan mendasar antara metode eliminasi Gauss dengan metode substitusi dalam menyelesaikan SPLTV!',
      'Opsi A': '',
      'Opsi B': '',
      'Opsi C': '',
      'Opsi D': '',
      'Opsi E': '',
      'Kunci Jawaban': '',
      'Bobot Poin': 20,
      'Tingkat Kesulitan': 'SULIT',
      'Topik': 'Metode Aljabar',
      'Pembahasan': 'Metode eliminasi menghilangkan variabel dengan operasi baris, sedangkan substitusi mengganti satu variabel dengan ekspresi variabel lainnya.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 12 }, // Tipe Soal
    { wch: 45 }, // Pertanyaan
    { wch: 24 }, // Opsi A
    { wch: 24 }, // Opsi B
    { wch: 24 }, // Opsi C
    { wch: 24 }, // Opsi D
    { wch: 24 }, // Opsi E
    { wch: 14 }, // Kunci
    { wch: 12 }, // Poin
    { wch: 16 }, // Kesulitan
    { wch: 16 }, // Topik
    { wch: 40 }  // Pembahasan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Soal');
  XLSX.writeFile(workbook, 'Template_Import_Bank_Soal.xlsx');
}

/**
 * Parse uploaded Excel file for questions
 */
export async function parseQuestionExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('File Excel tidak memiliki data soal.');
        }

        const parsedQuestions = rawRows.map((row, idx) => {
          const getVal = (keys) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(
                col => col.trim().toLowerCase() === k.toLowerCase()
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                return String(row[foundKey]).trim();
              }
            }
            return '';
          };

          const rawType = getVal(['Tipe Soal', 'Tipe', 'Type', 'Jenis Soal']);
          const isEssay = /esai|essay|uraian/i.test(rawType);
          const question_type = isEssay ? 'ESSAY' : 'MULTIPLE_CHOICE';

          const question_text = getVal(['Pertanyaan', 'Soal', 'Question', 'Teks Soal', 'Teks Pertanyaan']);
          const optionA = getVal(['Opsi A', 'A', 'Pilihan A', 'Option A']);
          const optionB = getVal(['Opsi B', 'B', 'Pilihan B', 'Option B']);
          const optionC = getVal(['Opsi C', 'C', 'Pilihan C', 'Option C']);
          const optionD = getVal(['Opsi D', 'D', 'Pilihan D', 'Option D']);
          const optionE = getVal(['Opsi E', 'E', 'Pilihan E', 'Option E']);

          let correct_answer = getVal(['Kunci Jawaban', 'Kunci', 'Key', 'Jawaban', 'Answer']).toUpperCase().trim();
          if (correct_answer.length > 1) {
            const firstLetterMatch = correct_answer.match(/[A-E]/);
            if (firstLetterMatch) correct_answer = firstLetterMatch[0];
          }

          const points = Number(getVal(['Bobot Poin', 'Poin', 'Bobot', 'Points', 'Nilai'])) || (isEssay ? 20 : 10);
          
          let difficulty = getVal(['Tingkat Kesulitan', 'Kesulitan', 'Difficulty', 'Level']).toUpperCase();
          if (!['MUDAH', 'SEDANG', 'SULIT', 'HOTS'].includes(difficulty)) {
            difficulty = 'SEDANG';
          }

          const topic = getVal(['Topik', 'Materi', 'Topic', 'Bab', 'KD']) || 'Umum';
          const explanation = getVal(['Pembahasan', 'Penjelasan', 'Explanation', 'Keterangan']);

          const options = [];
          if (question_type === 'MULTIPLE_CHOICE') {
            if (optionA) options.push({ id: 'A', text: optionA });
            if (optionB) options.push({ id: 'B', text: optionB });
            if (optionC) options.push({ id: 'C', text: optionC });
            if (optionD) options.push({ id: 'D', text: optionD });
            if (optionE) options.push({ id: 'E', text: optionE });
          }

          const errors = [];
          if (!question_text) errors.push('Teks soal wajib diisi');
          if (question_type === 'MULTIPLE_CHOICE') {
            if (options.length < 2) errors.push('Minimal 2 opsi pilihan (A & B)');
            if (!correct_answer || !options.some(o => o.id === correct_answer)) {
              errors.push('Kunci jawaban belum ditentukan atau tidak sesuai opsi');
            }
          }

          return {
            number: idx + 1,
            question_text,
            question_type,
            options,
            optionA,
            optionB,
            optionC,
            optionD,
            optionE,
            correct_answer: question_type === 'ESSAY' ? '' : (correct_answer || 'A'),
            points,
            difficulty,
            topic,
            explanation,
            isValid: errors.length === 0,
            errors
          };
        });

        resolve(parsedQuestions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ========================================================
// 3. BANK SOAL - WORD (.DOCX) PARSER & TEMPLATE GUIDE
// ========================================================

/**
 * Download sample text / guide for Word question format
 */
export function downloadQuestionWordTemplateGuide() {
  const content = `FORMAT PENULISAN SOAL MICROSOFT WORD (.DOCX) UNTUK EDUSMART LMS
===================================================================

Petunjuk:
1. Setiap nomor soal diawali dengan angka dan titik (misal: "1." atau "1)").
2. Pilihan ganda diawali huruf A, B, C, D, E diikuti titik atau kurung tutup (misal: "A." atau "A)").
3. Kunci jawaban ditulis di baris baru dengan format "Kunci: A" atau "KUNCI: B".
4. Pembahasan (opsional) ditulis dengan format "Pembahasan: [isi pembahasan]".
5. Untuk soal Esai/Uraian, cantumkan "Tipe: Esai" di bawah teks soal.

-------------------------------------------------------------------
CONTOH SOAL PILIHAN GANDA:
-------------------------------------------------------------------
1. Hasil dari sistem persamaan linear x + y = 5 dan x - y = 1 adalah...
A. x = 3, y = 2
B. x = 4, y = 1
C. x = 2, y = 3
D. x = 5, y = 0
E. x = 1, y = 4
Kunci: A
Pembahasan: Menjumlahkan kedua persamaan menghasilkan 2x = 6 sehingga x = 3, maka y = 2.
Tingkat: SEDANG
Topik: SPLDV

2. Lambang sila ketiga Pancasila adalah...
A. Bintang Tunggal
B. Rantai Emas
C. Pohon Beringin
D. Kepala Banteng
E. Padi dan Kapas
Kunci: C
Pembahasan: Sila ke-3 "Persatuan Indonesia" dilambangkan dengan Pohon Beringin.
Tingkat: MUDAH
Topik: PKn

-------------------------------------------------------------------
CONTOH SOAL ESAI / URAIAN:
-------------------------------------------------------------------
3. Jelaskan langkah-langkah dalam menyelesaikan SPLTV dengan metode gabungan eliminasi dan substitusi!
Tipe: Esai
Bobot: 20
Tingkat: SULIT
Topik: Aljabar
Pembahasan: 1. Eliminasi salah satu variabel dari dua pasang persamaan. 2. Selesaikan SPLDV yang terbentuk. 3. Substitusikan nilai ke persamaan semula.
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Panduan_Format_Soal_Word.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse uploaded Word (.docx) file for questions
 */
export async function parseQuestionWord(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || '';

  if (!rawText.trim()) {
    throw new Error('Dokumen Word kosong atau tidak dapat diekstrak.');
  }

  // Split lines
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Group into question blocks based on numbered prefixes (e.g. "1.", "2)", "[1]", etc.)
  const questionBlocks = [];
  let currentBlock = [];

  const isQuestionStart = (line) => {
    return /^(\d+)[\.\)]\s+/.test(line);
  };

  for (const line of lines) {
    if (isQuestionStart(line)) {
      if (currentBlock.length > 0) {
        questionBlocks.push(currentBlock);
      }
      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock);
  }

  if (questionBlocks.length === 0) {
    throw new Error(
      'Format soal Word tidak dikenali. Pastikan setiap butir soal diawali dengan nomor (contoh: "1. Teks soal"). Silakan unduh panduan format.'
    );
  }

  const parsedQuestions = questionBlocks.map((block, idx) => {
    let question_text = '';
    const options = [];
    let correct_answer = '';
    let explanation = '';
    let difficulty = 'SEDANG';
    let topic = 'Umum';
    let points = 10;
    let question_type = 'MULTIPLE_CHOICE';

    let readingQuestionText = true;

    for (let i = 0; i < block.length; i++) {
      const line = block[i];

      // Question start
      if (i === 0) {
        question_text = line.replace(/^\d+[\.\)]\s+/, '').trim();
        continue;
      }

      // Check Option prefix (A., B., C., D., E., A), etc.)
      const optMatch = line.match(/^([A-Ea-e])[\.\)]\s+(.*)/);
      if (optMatch) {
        readingQuestionText = false;
        const optLetter = optMatch[1].toUpperCase();
        const optText = optMatch[2].trim();
        options.push({ id: optLetter, text: optText });
        continue;
      }

      // Check Key Answer: "Kunci: A" or "KUNCI : A" or "Jawaban: A" or "Answer: A"
      const keyMatch = line.match(/^(?:kunci|kunci jawaban|jawaban|answer|ans)\s*[:=]\s*([A-Ea-e])/i);
      if (keyMatch) {
        readingQuestionText = false;
        correct_answer = keyMatch[1].toUpperCase();
        continue;
      }

      // Check Type: "Tipe: Esai" or "Tipe: PG"
      const typeMatch = line.match(/^(?:tipe|type|jenis)\s*[:=]\s*(.*)/i);
      if (typeMatch) {
        readingQuestionText = false;
        if (/esai|essay|uraian/i.test(typeMatch[1])) {
          question_type = 'ESSAY';
          points = 20;
        }
        continue;
      }

      // Check Explanation: "Pembahasan: ..." or "Penjelasan: ..."
      const expMatch = line.match(/^(?:pembahasan|penjelasan|explanation)\s*[:=]\s*(.*)/i);
      if (expMatch) {
        readingQuestionText = false;
        explanation = expMatch[1].trim();
        continue;
      }

      // Check Difficulty: "Tingkat: SULIT" or "Kesulitan: MUDAH"
      const diffMatch = line.match(/^(?:tingkat|kesulitan|difficulty|level)\s*[:=]\s*(.*)/i);
      if (diffMatch) {
        readingQuestionText = false;
        const d = diffMatch[1].toUpperCase().trim();
        if (['MUDAH', 'SEDANG', 'SULIT', 'HOTS'].includes(d)) {
          difficulty = d;
        }
        continue;
      }

      // Check Topic: "Topik: SPLTV"
      const topicMatch = line.match(/^(?:topik|materi|topic)\s*[:=]\s*(.*)/i);
      if (topicMatch) {
        readingQuestionText = false;
        topic = topicMatch[1].trim();
        continue;
      }

      // Check Points: "Bobot: 15" or "Poin: 15"
      const ptMatch = line.match(/^(?:bobot|poin|points)\s*[:=]\s*(\d+)/i);
      if (ptMatch) {
        readingQuestionText = false;
        points = Number(ptMatch[1]) || points;
        continue;
      }

      // If still reading question text, append line
      if (readingQuestionText) {
        question_text += '\n' + line;
      } else if (explanation && !expMatch) {
        explanation += ' ' + line;
      }
    }

    if (options.length === 0 && question_type === 'MULTIPLE_CHOICE') {
      question_type = 'ESSAY';
      points = 20;
    }

    const errors = [];
    if (!question_text.trim()) errors.push('Teks pertanyaan kosong');
    if (question_type === 'MULTIPLE_CHOICE') {
      if (options.length < 2) errors.push('Pilihan opsi kurang dari 2');
      if (!correct_answer) errors.push('Kunci jawaban belum terdeteksi (Contoh: "Kunci: A")');
    }

    return {
      number: idx + 1,
      question_text: question_text.trim(),
      question_type,
      options,
      optionA: options.find(o => o.id === 'A')?.text || '',
      optionB: options.find(o => o.id === 'B')?.text || '',
      optionC: options.find(o => o.id === 'C')?.text || '',
      optionD: options.find(o => o.id === 'D')?.text || '',
      optionE: options.find(o => o.id === 'E')?.text || '',
      correct_answer: question_type === 'ESSAY' ? '' : (correct_answer || 'A'),
      points,
      difficulty,
      topic,
      explanation,
      isValid: errors.length === 0,
      errors
    };
  });

  return parsedQuestions;
}
