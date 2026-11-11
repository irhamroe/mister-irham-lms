import React, { useState, useEffect } from 'react';
import {
  Code2,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
  Send,
  X,
  Clock,
  HardDrive,
  FileText,
  Lightbulb,
  Maximize2,
  Minimize2,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { executeCode, evaluateLkpdCode } from '../services/codeRunnerService';

export default function TlxTokiArena({
  material,
  user,
  onClose,
  onSubmitLkpd,
  isSubmitting = false
}) {
  // Problems List from material or fallback to standard TLX Pemrograman Dasar problems
  const problems = (material?.tlx_problems && material.tlx_problems.length > 0)
    ? material.tlx_problems
    : [
        {
          id: 'prob-a',
          letter: 'A',
          title: 'Halo, Dunia!',
          time_limit: '1.000 detik',
          memory_limit: '64.0 MB',
          points: 25,
          description: `Pak Dengklek baru saja membeli komputer baru. Sebagai pemula di dunia pemrograman dan algoritma, Pak Dengklek ingin membuat program pertamanya yang menyapa seluruh dunia dengan ramah melalui layar monitor.\n\nTugas Anda adalah membantu Pak Dengklek menulis program yang mencetak kalimat sapaan tersebut tepat seperti yang diminta.`,
          input_format: 'Tidak ada masukan untuk soal ini.',
          output_format: 'Cetak sebuah baris berisi tepat teks "Halo, Dunia!" (tanpa tanda kutip).',
          constraints: 'Tidak ada batasan khusus.',
          sample_cases: [
            {
              input: '',
              output: 'Halo, Dunia!',
              explanation: 'Program langsung mencetak teks tanpa memerlukan masukan pengguna.'
            }
          ],
          editorial: `Pada soal ini, Anda hanya perlu menggunakan perintah dasar keluaran:\n- **Python 3:** Gunakan perintah \`print("Halo, Dunia!")\`.\n- **C++:** Gunakan \`std::cout << "Halo, Dunia!" << std::endl;\` di dalam fungsi \`int main()\`. Perhatikan huruf kapital dan tanda baca koma serta tanda seru!`,
          starter_codes: {
            python: `# Program Pertama Pak Dengklek\nprint("Halo, Dunia!")\n`,
            cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Halo, Dunia!" << endl;\n    return 0;\n}\n`
          },
          test_cases: [
            { input: '', expected_output: 'Halo, Dunia!', description: 'Kasus Uji 1: Output Sesuai' }
          ]
        },
        {
          id: 'prob-b',
          letter: 'B',
          title: 'A Tambah B',
          time_limit: '1.000 detik',
          memory_limit: '64.0 MB',
          points: 25,
          description: `Pak Dengklek memiliki dua buah kandang bebek. Kandang pertama berisi A ekor bebek, dan kandang kedua berisi B ekor bebek.\n\nPak Dengklek ingin mengetahui berapa jumlah seluruh bebek miliknya jika digabungkan. Bantulah Pak Dengklek menghitung total bebek tersebut!`,
          input_format: 'Satu baris berisi dua buah bilangan bulat A dan B yang dipisahkan oleh satu spasi.',
          output_format: 'Satu baris berisi sebuah bilangan bulat yang merupakan hasil penjumlahan A + B.',
          constraints: '1 ≤ A, B ≤ 1.000',
          sample_cases: [
            {
              input: '4 7',
              output: '11',
              explanation: '4 bebek ditambah 7 bebek menghasilkan total 11 bebek.'
            },
            {
              input: '15 25',
              output: '40',
              explanation: '15 + 25 = 40.'
            }
          ],
          editorial: `Soal ini menguji kemampuan membaca masukan integer dan menjumlahkannya:\n- **Python 3:** Gunakan \`a, b = map(int, input().split())\` lalu \`print(a + b)\`.\n- **C++:** Deklarasikan variabel \`int a, b;\` lalu baca dengan \`cin >> a >> b;\` dan cetak \`cout << a + b << endl;\`.`,
          starter_codes: {
            python: `# Membaca dua bilangan A dan B dari satu baris\na, b = map(int, input().split())\n\n# Cetak hasil penjumlahan\nprint(a + b)\n`,
            cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n`
          },
          test_cases: [
            { input: '4 7', expected_output: '11', description: 'Kasus Uji 1 (Sample 1)' },
            { input: '15 25', expected_output: '40', description: 'Kasus Uji 2 (Sample 2)' },
            { input: '100 250', expected_output: '350', description: 'Kasus Uji 3' },
            { input: '999 1', expected_output: '1000', description: 'Kasus Uji 4' }
          ]
        },
        {
          id: 'prob-c',
          letter: 'C',
          title: 'Bebek untuk Teman (Pembagian & Modulo)',
          time_limit: '1.000 detik',
          memory_limit: '64.0 MB',
          points: 25,
          description: `Pak Dengklek memiliki N ekor bebek. Hari ini, M orang temannya berkunjung ke peternakan. Pak Dengklek ingin membagikan bebek-bebek tersebut kepada semua temannya secara adil dan merata (setiap teman mendapat jumlah bebek bulat yang sama).\n\nJika ada bebek yang tersisa karena tidak bisa dibagi rata, sisa bebek tersebut akan tetap disimpan di peternakan Pak Dengklek.\n\nBantulah Pak Dengklek menghitung berapa ekor bebek yang didapat oleh masing-masing teman, dan berapa ekor bebek yang tersisa!`,
          input_format: 'Satu baris berisi dua buah bilangan bulat N dan M yang dipisahkan oleh spasi, masing-masing menyatakan banyaknya bebek dan banyaknya teman.',
          output_format: 'Baris pertama berisi teks "masing-masing " diikuti jumlah bebek yang didapat setiap teman.\nBaris kedua berisi teks "bersisa " diikuti sisa bebek Pak Dengklek.',
          constraints: '1 ≤ N ≤ 100.000\n1 ≤ M ≤ N',
          sample_cases: [
            {
              input: '63 5',
              output: 'masing-masing 12\nbersisa 3',
              explanation: '63 bebek dibagi 5 orang: 63 / 5 = 12 dengan sisa 3 (karena 12 * 5 + 3 = 63).'
            }
          ],
          editorial: `Soal ini melatih penggunaan operator pembagian bulat dan modulo (sisa bagi):\n- **Python:** Pembagian bulat menggunakan \`//\` (misal \`n // m\`) dan sisa bagi menggunakan \`%\` (misal \`n % m\`).\n- **C++:** Tipe data integer \`/\` otomatis membuang desimal (integer division), dan modulo menggunakan tanda \`%\`.`,
          starter_codes: {
            python: `n, m = map(int, input().split())\n\n# Hitung pembagian bulat dan modulo\nsetiap = n // m\nsisa = n % m\n\nprint(f"masing-masing {setiap}")\nprint(f"bersisa {sisa}")\n`,
            cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, m;\n    cin >> n >> m;\n    int setiap = n / m;\n    int sisa = n % m;\n    cout << "masing-masing " << setiap << endl;\n    cout << "bersisa " << sisa << endl;\n    return 0;\n}\n`
          },
          test_cases: [
            { input: '63 5', expected_output: 'masing-masing 12\nbersisa 3', description: 'Kasus Uji 1 (Sample)' },
            { input: '100 10', expected_output: 'masing-masing 10\nbersisa 0', description: 'Kasus Uji 2 (Habis Dibagi)' },
            { input: '17 4', expected_output: 'masing-masing 4\nbersisa 1', description: 'Kasus Uji 3' }
          ]
        },
        {
          id: 'prob-d',
          letter: 'D',
          title: 'Penentu Bilangan Genap atau Ganjil',
          time_limit: '1.000 detik',
          memory_limit: '64.0 MB',
          points: 25,
          description: `Pak Dengklek sedang melatih bebek-bebeknya untuk berbaris rapi. Setiap bebek diberi nomor dada berupa sebuah bilangan bulat positif N.\n\nBebek dengan nomor GENAP harus berbaris di sebelah kanan sungai, sedangkan bebek dengan nomor GANJIL harus berbaris di sebelah kiri sungai.\n\nBantulah Pak Dengklek membuat program penentu arah barisan tersebut!`,
          input_format: 'Satu baris berisi sebuah bilangan bulat positif N.',
          output_format: 'Cetak tepat satu baris berisi kata "GENAP" jika N genap, atau "GANJIL" jika N ganjil (semua huruf kapital tanpa tanda kutip).',
          constraints: '1 ≤ N ≤ 1.000.000',
          sample_cases: [
            {
              input: '8',
              output: 'GENAP',
              explanation: '8 adalah bilangan genap karena habis dibagi 2.'
            },
            {
              input: '15',
              output: 'GANJIL',
              explanation: '15 adalah bilangan ganjil karena bersisa 1 ketika dibagi 2.'
            }
          ],
          editorial: `Struktur percabangan dasar (if-else):\nSebuah bilangan bulat $N$ dikatakan genap jika $N \\pmod 2 = 0$. Selain itu, bilangan tersebut adalah ganjil.\n- **Python:** \`if n % 2 == 0: print("GENAP") else: print("GANJIL")\`\n- **C++:** \`if (n % 2 == 0) cout << "GENAP" << endl; else cout << "GANJIL" << endl;\``,
          starter_codes: {
            python: `n = int(input())\n\n# Percabangan if-else penentu genap/ganjil\nif n % 2 == 0:\n    print("GENAP")\nelse:\n    print("GANJIL")\n`,
            cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    if (n % 2 == 0) {\n        cout << "GENAP" << endl;\n    } else {\n        cout << "GANJIL" << endl;\n    }\n    return 0;\n}\n`
          },
          test_cases: [
            { input: '8', expected_output: 'GENAP', description: 'Kasus Uji 1 (Genap)' },
            { input: '15', expected_output: 'GANJIL', description: 'Kasus Uji 2 (Ganjil)' },
            { input: '0', expected_output: 'GENAP', description: 'Kasus Uji 3 (Nol)' },
            { input: '99999', expected_output: 'GANJIL', description: 'Kasus Uji 4 (Ganjil Besar)' }
          ]
        }
      ];

  // Active Problem Index
  const [activeIdx, setActiveIdx] = useState(0);
  const currentProblem = problems[activeIdx] || problems[0];

  // Code state per problem & language
  const [codeLanguage, setCodeLanguage] = useState('python'); // 'python' | 'cpp'
  const [codeStorage, setCodeStorage] = useState(() => {
    const initial = {};
    problems.forEach(p => {
      initial[p.id] = {
        python: p.starter_codes?.python || '',
        cpp: p.starter_codes?.cpp || ''
      };
    });
    return initial;
  });

  // Current problem's active code
  const currentCode = codeStorage[currentProblem.id]?.[codeLanguage] || '';

  // Verdict state per problem: { [problemId]: { verdict: 'AC'|'WA'|'CE'|'TLE'|'RTE', score: number, results: [], firstError: '' } }
  const [verdicts, setVerdicts] = useState({});

  // UI state
  const [leftTab, setLeftTab] = useState('statement'); // 'statement' | 'theory'
  const [isJudging, setIsJudging] = useState(false);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState('');
  const [isRunningCustom, setIsRunningCustom] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  // Sync starter code if problem or language switches
  const handleCodeChange = (newCode) => {
    setCodeStorage(prev => ({
      ...prev,
      [currentProblem.id]: {
        ...prev[currentProblem.id],
        [codeLanguage]: newCode
      }
    }));
  };

  // Reset current code to starter
  const handleResetCode = () => {
    if (window.confirm('Kembalikan kode ke template awal Pak Dengklek?')) {
      const defaultStarter = currentProblem.starter_codes?.[codeLanguage] || '';
      handleCodeChange(defaultStarter);
    }
  };

  // Copy sample case text
  const handleCopySample = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Run Custom Input Test
  const handleRunCustomTest = async () => {
    if (isRunningCustom) return;
    setIsRunningCustom(true);
    setCustomOutput('Menjalankan kode...');

    try {
      const res = await executeCode({
        language: codeLanguage,
        code: currentCode,
        stdin: customInput
      });

      if (res.success) {
        setCustomOutput(res.stdout || '(Tidak ada output yang dicetak)');
      } else {
        setCustomOutput(`[ERROR]\n${res.error || res.stderr || res.compile_output}`);
      }
    } catch (e) {
      setCustomOutput(`Error Eksekusi: ${e.message}`);
    } finally {
      setIsRunningCustom(false);
    }
  };

  // Submit to Online Judge
  const handleSubmitToJudge = async () => {
    if (isJudging) return;
    setIsJudging(true);

    try {
      const testCases = currentProblem.test_cases || [];
      const evalRes = await evaluateLkpdCode({
        language: codeLanguage,
        code: currentCode,
        testCases
      });

      let calculatedVerdict = 'WA';
      if (evalRes.allPassed) {
        calculatedVerdict = 'AC';
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      } else if (evalRes.results?.some(r => r.status === 'Compilation Error')) {
        calculatedVerdict = 'CE';
      } else if (evalRes.results?.some(r => r.status === 'Time Limit Exceeded')) {
        calculatedVerdict = 'TLE';
      } else if (evalRes.results?.some(r => r.status === 'Runtime Error')) {
        calculatedVerdict = 'RTE';
      } else {
        calculatedVerdict = 'WA';
      }

      const points = calculatedVerdict === 'AC' ? (currentProblem.points || 25) : 0;

      setVerdicts(prev => ({
        ...prev,
        [currentProblem.id]: {
          verdict: calculatedVerdict,
          score: points,
          results: evalRes.results,
          firstError: evalRes.firstError,
          language: codeLanguage,
          submittedAt: new Date().toLocaleTimeString('id-ID')
        }
      }));
    } catch (err) {
      setVerdicts(prev => ({
        ...prev,
        [currentProblem.id]: {
          verdict: 'RTE',
          score: 0,
          results: [],
          firstError: `Error Judge: ${err.message}`,
          language: codeLanguage
        }
      }));
    } finally {
      setIsJudging(false);
    }
  };

  // Calculate Overall Score & AC Count
  const totalAC = problems.filter(p => verdicts[p.id]?.verdict === 'AC').length;
  const totalScore = problems.reduce((acc, p) => acc + (verdicts[p.id]?.score || 0), 0);
  const maxPossibleScore = problems.reduce((acc, p) => acc + (p.points || 25), 0);
  const currentVerdict = verdicts[currentProblem.id];

  // Final Submit LKPD
  const handleFinalSubmitLkpd = async () => {
    if (isSubmittingAll) return;

    // Build comprehensive submission report
    let reportText = `=== LAPORAN LKPD PEMROGRAMAN DASAR (TLX TOKI STYLE) ===\n`;
    reportText += `Materi: ${material?.title || 'Algoritma dan Pemrograman'}\n`;
    reportText += `Siswa: ${user?.name} (${user?.nis_nip || user?.username || '-'})\n`;
    reportText += `Total Skor: ${totalScore} / ${maxPossibleScore} (${totalAC} dari ${problems.length} Soal AC)\n\n`;

    problems.forEach(p => {
      const v = verdicts[p.id];
      const lang = v?.language || 'python';
      const code = codeStorage[p.id]?.[lang] || '';
      reportText += `--------------------------------------------------\n`;
      reportText += `[SOAL ${p.letter}] ${p.title}\n`;
      reportText += `Status: ${v ? v.verdict : 'Belum Submit'} | Nilai: ${v ? v.score : 0} Poin | Bahasa: ${lang.toUpperCase()}\n`;
      reportText += `KODE SOLUSI:\n${code}\n\n`;
    });

    setIsSubmittingAll(true);
    try {
      await onSubmitLkpd({
        answer_text: reportText,
        score: totalScore,
        ac_count: totalAC,
        total_problems: problems.length
      });

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAll(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#090d16',
        color: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR (TLX TOKI DARK BRANDED HEADER)                   */}
      {/* ============================================================== */}
      <header
        style={{
          height: 60,
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0
        }}
      >
        {/* Brand & Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              padding: '6px 12px',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
            }}
          >
            <Terminal size={18} color="#fff" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px', color: '#fff' }}>
              TLX TOKI ARENA
            </span>
          </div>

          <div style={{ display: 'none', md: 'block', height: 20, width: 1, background: '#334155' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e2e8f0' }}>
              {material?.title || 'Pemrograman Dasar: Algoritma dan Pemrograman'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Kurikulum Informatika & Olimpiade Sains Nasional (OSN)
            </span>
          </div>
        </div>

        {/* Center: Problem Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {problems.map((p, idx) => {
            const v = verdicts[p.id];
            const isActive = idx === activeIdx;
            let badgeBg = '#334155';
            let badgeColor = '#94a3b8';
            let label = p.letter;

            if (v?.verdict === 'AC') {
              badgeBg = '#059669';
              badgeColor = '#ffffff';
            } else if (v?.verdict && v.verdict !== 'AC') {
              badgeBg = '#dc2626';
              badgeColor = '#ffffff';
            }

            return (
              <button
                key={p.id}
                onClick={() => setActiveIdx(idx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  border: isActive ? '2px solid #3b82f6' : '1px solid #1e293b',
                  background: isActive ? '#1e293b' : '#0b1120',
                  color: isActive ? '#60a5fa' : '#cbd5e1',
                  transition: 'all 0.15s ease'
                }}
                title={`${p.letter}. ${p.title} (${v ? v.verdict : 'Belum Submit'})`}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '0.72rem',
                    lineHeight: '18px',
                    textAlign: 'center',
                    fontWeight: 800
                  }}
                >
                  {label}
                </span>
                <span style={{ maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.title}
                </span>
                {v?.verdict === 'AC' && <Check size={14} color="#10b981" />}
              </button>
            );
          })}
        </div>

        {/* Right: Score Counter & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: totalAC === problems.length ? 'rgba(16,185,129,0.15)' : '#1e293b',
              border: totalAC === problems.length ? '1px solid #10b981' : '1px solid #334155',
              padding: '6px 14px',
              borderRadius: 8
            }}
          >
            <Award size={18} color={totalAC === problems.length ? '#10b981' : '#f59e0b'} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: totalAC === problems.length ? '#34d399' : '#fbbf24' }}>
                Skor: {totalScore} / {maxPossibleScore}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {totalAC} dari {problems.length} Soal AC
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'background 0.15s'
            }}
            title="Keluar dari TLX Arena"
          >
            <X size={16} /> Tutup
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. DUAL-PANE ARENA WORKSPACE (LEFT: SOAL | RIGHT: COMPILER)    */}
      {/* ============================================================== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN: PROBLEM STATEMENT & SAMPLES                     */}
        {/* ------------------------------------------------------------ */}
        <div
          style={{
            flex: 1,
            minWidth: 320,
            maxWidth: '52%',
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            background: '#0f172a'
          }}
        >
          {/* Sub Header / Tabs */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0b1324'
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#3b82f6' }}>{currentProblem.letter}.</span> {currentProblem.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: '0.74rem', color: '#94a3b8' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="#38bdf8" /> Batas Waktu: <strong style={{ color: '#e2e8f0' }}>{currentProblem.time_limit}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <HardDrive size={12} color="#a78bfa" /> Batas Memori: <strong style={{ color: '#e2e8f0' }}>{currentProblem.memory_limit}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Award size={12} color="#f59e0b" /> Bobot: <strong style={{ color: '#fbbf24' }}>{currentProblem.points || 25} Poin</strong>
                </span>
              </div>
            </div>

            {/* Statement vs Theory Tab Switcher */}
            <div style={{ display: 'flex', background: '#1e293b', borderRadius: 6, padding: 3, border: '1px solid #334155' }}>
              <button
                onClick={() => setLeftTab('statement')}
                style={{
                  background: leftTab === 'statement' ? '#2563eb' : 'transparent',
                  color: leftTab === 'statement' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <FileText size={13} /> Deskripsi Soal
              </button>
              <button
                onClick={() => setLeftTab('theory')}
                style={{
                  background: leftTab === 'theory' ? '#2563eb' : 'transparent',
                  color: leftTab === 'theory' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Lightbulb size={13} /> Petunjuk Teori
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', lineHeight: 1.65, fontSize: '0.9rem', color: '#cbd5e1' }}>
            {leftTab === 'statement' ? (
              <div>
                {/* Deskripsi Cerita Pak Dengklek */}
                <div style={{ marginBottom: 22 }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa', fontWeight: 800, marginBottom: 8 }}>
                    Deskripsi
                  </h4>
                  <p style={{ whiteSpace: 'pre-line', color: '#e2e8f0' }}>
                    {currentProblem.description}
                  </p>
                </div>

                {/* Format Masukan */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa', fontWeight: 800, marginBottom: 8 }}>
                    Format Masukan
                  </h4>
                  <div style={{ background: '#1e293b', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: '0 6px 6px 0', color: '#f1f5f9' }}>
                    {currentProblem.input_format}
                  </div>
                </div>

                {/* Format Keluaran */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa', fontWeight: 800, marginBottom: 8 }}>
                    Format Keluaran
                  </h4>
                  <div style={{ background: '#1e293b', borderLeft: '4px solid #10b981', padding: '10px 14px', borderRadius: '0 6px 6px 0', color: '#f1f5f9' }}>
                    {currentProblem.output_format}
                  </div>
                </div>

                {/* Contoh Masukan & Contoh Keluaran ala TLX */}
                <div style={{ marginBottom: 22 }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa', fontWeight: 800, marginBottom: 10 }}>
                    Contoh Masukan & Keluaran
                  </h4>

                  {(currentProblem.sample_cases || []).map((sample, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        marginBottom: 16,
                        border: '1px solid #334155',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#0b1120'
                      }}
                    >
                      <div
                        style={{
                          background: '#1e293b',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#94a3b8',
                          borderBottom: '1px solid #334155'
                        }}
                      >
                        Contoh #{sIdx + 1}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        {/* Sample Input */}
                        <div style={{ borderRight: '1px solid #334155', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>Contoh Masukan</span>
                            {sample.input && (
                              <button
                                onClick={() => handleCopySample(sample.input, `in-${sIdx}`)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedIdx === `in-${sIdx}` ? '#10b981' : '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {copiedIdx === `in-${sIdx}` ? <Check size={12} /> : <Copy size={12} />}
                                {copiedIdx === `in-${sIdx}` ? 'Tersalin' : 'Salin'}
                              </button>
                            )}
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: "'Fira Code', 'Courier New', monospace",
                              fontSize: '0.82rem',
                              color: '#f8fafc',
                              background: '#060a12',
                              padding: '8px 10px',
                              borderRadius: 4,
                              minHeight: 36,
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {sample.input || '(Kosong)'}
                          </pre>
                        </div>

                        {/* Sample Output */}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399' }}>Contoh Keluaran</span>
                            {sample.output && (
                              <button
                                onClick={() => handleCopySample(sample.output, `out-${sIdx}`)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedIdx === `out-${sIdx}` ? '#10b981' : '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {copiedIdx === `out-${sIdx}` ? <Check size={12} /> : <Copy size={12} />}
                                {copiedIdx === `out-${sIdx}` ? 'Tersalin' : 'Salin'}
                              </button>
                            )}
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: "'Fira Code', 'Courier New', monospace",
                              fontSize: '0.82rem',
                              color: '#34d399',
                              background: '#060a12',
                              padding: '8px 10px',
                              borderRadius: 4,
                              minHeight: 36,
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {sample.output}
                          </pre>
                        </div>
                      </div>

                      {sample.explanation && (
                        <div style={{ padding: '8px 12px', background: '#0b1324', borderTop: '1px solid #1e293b', fontSize: '0.76rem', color: '#94a3b8' }}>
                          <strong>Penjelasan:</strong> {sample.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Batasan (Constraints) */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa', fontWeight: 800, marginBottom: 8 }}>
                    Batasan
                  </h4>
                  <div
                    style={{
                      background: '#111827',
                      border: '1px dashed #374151',
                      padding: '10px 14px',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                      fontFamily: "'Fira Code', monospace",
                      color: '#cbd5e1'
                    }}
                  >
                    {currentProblem.constraints || 'Tidak ada batasan khusus.'}
                  </div>
                </div>
              </div>
            ) : (
              /* Petunjuk Teori & Pembahasan */
              <div>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: 8, border: '1px solid #334155', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lightbulb size={18} color="#f59e0b" /> Petunjuk Solusi Soal {currentProblem.letter}
                  </h3>
                  <div style={{ whiteSpace: 'pre-line', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {currentProblem.editorial || 'Belum ada petunjuk khusus untuk soal ini.'}
                  </div>
                </div>

                {material?.content && (
                  <div style={{ background: '#0b1324', padding: '16px', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>
                      Materi Pembelajaran Bab Ini:
                    </h4>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      {material.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Problem Bottom Switcher (Prev / Next Problem) */}
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid #1e293b',
              background: '#0b1120',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <button
              disabled={activeIdx === 0}
              onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
              style={{
                background: '#1e293b',
                color: activeIdx === 0 ? '#475569' : '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ChevronLeft size={14} /> Soal Sebelumnya
            </button>

            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Soal {activeIdx + 1} dari {problems.length}
            </span>

            <button
              disabled={activeIdx === problems.length - 1}
              onClick={() => setActiveIdx(prev => Math.min(problems.length - 1, prev + 1))}
              style={{
                background: '#1e293b',
                color: activeIdx === problems.length - 1 ? '#475569' : '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: activeIdx === problems.length - 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Soal Berikutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN: CODE EDITOR & ONLINE JUDGE                     */}
        {/* ------------------------------------------------------------ */}
        <div style={{ flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', background: '#0a0f1d' }}>
          {/* Editor Header Toolbar */}
          <div
            style={{
              height: 48,
              background: '#0f172a',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0
            }}
          >
            {/* Language Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginRight: 4 }}>Bahasa:</span>
              <button
                onClick={() => setCodeLanguage('python')}
                style={{
                  background: codeLanguage === 'python' ? '#2563eb' : '#1e293b',
                  color: codeLanguage === 'python' ? '#fff' : '#94a3b8',
                  border: codeLanguage === 'python' ? '1px solid #3b82f6' : '1px solid #334155',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Python 3 (3.11)
              </button>
              <button
                onClick={() => setCodeLanguage('cpp')}
                style={{
                  background: codeLanguage === 'cpp' ? '#2563eb' : '#1e293b',
                  color: codeLanguage === 'cpp' ? '#fff' : '#94a3b8',
                  border: codeLanguage === 'cpp' ? '1px solid #3b82f6' : '1px solid #334155',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                C++ (GCC 14)
              </button>
            </div>

            {/* Font & Reset Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: '#1e293b', borderRadius: 4, border: '1px solid #334155' }}>
                <button
                  onClick={() => setFontSize(prev => Math.max(11, prev - 1))}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem' }}
                  title="Perkecil Font"
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSize(prev => Math.min(20, prev + 1))}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem' }}
                  title="Perbesar Font"
                >
                  A+
                </button>
              </div>

              <button
                onClick={handleResetCode}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Reset ke template kode awal"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Interactive Code Editor (Monospace) */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
            {/* Line Numbers */}
            <div
              style={{
                width: 44,
                background: '#070b14',
                color: '#475569',
                padding: '12px 6px',
                textAlign: 'right',
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
                userSelect: 'none',
                borderRight: '1px solid #1e293b'
              }}
            >
              {currentCode.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              value={currentCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  const val = e.target.value;
                  const updated = val.substring(0, start) + '    ' + val.substring(end);
                  handleCodeChange(updated);
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + 4;
                  }, 0);
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitToJudge();
                }
              }}
              style={{
                flex: 1,
                background: '#090e1a',
                color: '#f8fafc',
                border: 'none',
                outline: 'none',
                padding: '12px 16px',
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
                resize: 'none',
                whiteSpace: 'pre'
              }}
              placeholder={`Tuliskan solusi kode program ${codeLanguage === 'python' ? 'Python' : 'C++'} Anda di sini...`}
              spellCheck="false"
            />
          </div>

          {/* Custom Test Run Drawer (Collapsible) */}
          {customInputOpen && (
            <div style={{ borderTop: '1px solid #1e293b', background: '#0b1120', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8' }}>
                  Uji Coba Masukan Sendiri (Custom Input):
                </span>
                <button
                  disabled={isRunningCustom}
                  onClick={handleRunCustomTest}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: isRunningCustom ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Play size={12} fill="#fff" /> {isRunningCustom ? 'Menjalankan...' : 'Jalankan'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Ketik input di sini (misal: 10 20)..."
                  rows={2}
                  style={{
                    background: '#060a12',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.78rem',
                    resize: 'none'
                  }}
                />
                <div
                  style={{
                    background: '#060a12',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.78rem',
                    color: '#34d399',
                    overflowY: 'auto',
                    maxHeight: 60,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {customOutput || <span style={{ color: '#64748b' }}>(Output hasil akan tampil di sini)</span>}
                </div>
              </div>
            </div>
          )}

          {/* Verdict Box (Gaya TLX TOKI) */}
          {currentVerdict && (
            <div
              style={{
                borderTop: '2px solid',
                borderColor: currentVerdict.verdict === 'AC' ? '#059669' : '#dc2626',
                background: currentVerdict.verdict === 'AC' ? '#064e3b' : '#450a0a',
                padding: '12px 18px',
                maxHeight: 180,
                overflowY: 'auto',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      background: currentVerdict.verdict === 'AC' ? '#10b981' : '#ef4444',
                      color: '#ffffff',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: '0.9rem',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {currentVerdict.verdict}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
                    {currentVerdict.verdict === 'AC' && `ACCEPTED - 100 / 100 Poin (${currentProblem.points || 25} Poin Didapat)`}
                    {currentVerdict.verdict === 'WA' && 'WRONG ANSWER - Output Program Belum Sesuai'}
                    {currentVerdict.verdict === 'CE' && 'COMPILE ERROR - Sintaks Kode Mengalami Kesalahan'}
                    {currentVerdict.verdict === 'TLE' && 'TIME LIMIT EXCEEDED - Waktu Berjalan Melebihi Batas'}
                    {currentVerdict.verdict === 'RTE' && 'RUNTIME ERROR - Terjadi Kesalahan Saat Eksekusi'}
                  </span>
                </div>

                <span style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>
                  Waktu Submit: {currentVerdict.submittedAt}
                </span>
              </div>

              {/* Rincian Kasus Uji Table ala TLX TOKI */}
              {currentVerdict.results && currentVerdict.results.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '4px 8px' }}>#</th>
                        <th style={{ padding: '4px 8px' }}>Kasus Uji</th>
                        <th style={{ padding: '4px 8px' }}>Status</th>
                        <th style={{ padding: '4px 8px' }}>Waktu</th>
                        <th style={{ padding: '4px 8px' }}>Memori</th>
                        <th style={{ padding: '4px 8px' }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentVerdict.results.map((r, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f1f5f9' }}>
                          <td style={{ padding: '4px 8px', fontWeight: 700 }}>{rIdx + 1}</td>
                          <td style={{ padding: '4px 8px' }}>{r.description}</td>
                          <td style={{ padding: '4px 8px' }}>
                            <span
                              style={{
                                color: r.passed ? '#34d399' : '#f87171',
                                fontWeight: 800
                              }}
                            >
                              {r.passed ? 'AC' : r.status || 'WA'}
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px', color: '#cbd5e1' }}>{r.time || '0.01 detik'}</td>
                          <td style={{ padding: '4px 8px', color: '#cbd5e1' }}>{r.memory || '2.1 MB'}</td>
                          <td style={{ padding: '4px 8px', color: r.passed ? '#34d399' : '#fca5a5' }}>
                            {r.passed ? 'Sesuai' : (r.error || 'Output berbeda')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Error Callout Trace */}
              {currentVerdict.firstError && currentVerdict.verdict !== 'AC' && (
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#fca5a5', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap' }}>
                  {currentVerdict.firstError}
                </div>
              )}
            </div>
          )}

          {/* Action Footer (Submit & Test Custom Buttons) */}
          <div
            style={{
              height: 58,
              background: '#0f172a',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0
            }}
          >
            <button
              onClick={() => setCustomInputOpen(prev => !prev)}
              style={{
                background: customInputOpen ? '#334155' : '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Terminal size={14} color="#38bdf8" />
              {customInputOpen ? 'Tutup Uji Input Sendiri' : 'Uji Masukan Sendiri (Custom)'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                disabled={isJudging}
                onClick={handleSubmitToJudge}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: 6,
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isJudging ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
                  transition: 'transform 0.1s'
                }}
              >
                {isJudging ? (
                  <>
                    <RotateCcw size={15} className="spin" /> Sedang Menilai di Judge...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Kirim Jawaban (Submit ke Judge)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM FINAL BAR: ACCUMULATED SCORE & LKPD SUBMIT          */}
      {/* ============================================================== */}
      <footer
        style={{
          height: 60,
          background: '#090e1a',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color={totalAC === problems.length ? '#10b981' : '#f59e0b'} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                Akumulasi LKPD: {totalScore} / {maxPossibleScore} Poin
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: 8 }}>
                ({totalAC} dari {problems.length} Soal Berhasil AC)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {totalAC < problems.length && (
            <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontStyle: 'italic' }}>
              💡 Tips: Selesaikan seluruh soal hingga AC untuk mendapatkan nilai maksimal 100!
            </span>
          )}

          <button
            disabled={isSubmittingAll}
            onClick={handleFinalSubmitLkpd}
            style={{
              background: totalAC === problems.length
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : '#334155',
              color: '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isSubmittingAll ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: totalAC === problems.length ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} />
            {isSubmittingAll ? 'Mengumpulkan Jawaban...' : 'Kumpulkan LKPD Pemrograman & Buka Bab Selanjutnya'}
          </button>
        </div>
      </footer>
    </div>
  );
}

