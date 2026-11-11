import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Terminal,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { executeCode, LANGUAGE_CONFIG } from '../services/codeRunnerService';

export default function CodePlayground({
  initialLanguage = 'python',
  initialCode = '',
  onCodeChange = null,
  readOnly = false,
  title = 'Taman Bermain Koding (Interactive Code Playground)',
  description = 'Tulis, jalankan, dan amati hasil eksekusi program C++ dan Python secara langsung.',
  height = '320px'
}) {
  const [language, setLanguage] = useState(initialLanguage); // 'cpp' | 'python'
  const [code, setCode] = useState(initialCode || LANGUAGE_CONFIG[initialLanguage]?.defaultCode || '');
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync if initialLanguage changes
  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguage(initialLanguage);
      if (!initialCode) {
        setCode(LANGUAGE_CONFIG[initialLanguage]?.defaultCode || '');
      }
    }
  }, [initialLanguage]);

  // Sync if initialCode changes
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== null && initialCode !== '') {
      setCode(initialCode);
    }
  }, [initialCode]);

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    const newCode = LANGUAGE_CONFIG[newLang]?.defaultCode || '';
    setCode(newCode);
    setExecutionResult(null);
    if (onCodeChange) onCodeChange(newCode, newLang);
  }

  function handleCodeTextChange(newCode) {
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode, language);
  }

  // Handle Tab key in textarea
  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      if (onCodeChange) onCodeChange(newCode, language);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  }

  async function handleRunCode() {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const result = await executeCode({
        language,
        code,
        stdin
      });
      setExecutionResult(result);
    } catch (err) {
      setExecutionResult({
        success: false,
        stdout: '',
        stderr: err.message,
        error: `Gagal menjalankan program: ${err.message}`,
        status: 'Client Error'
      });
    } finally {
      setIsRunning(false);
    }
  }

  function handleReset() {
    const defaultCode = LANGUAGE_CONFIG[language]?.defaultCode || '';
    setCode(defaultCode);
    setExecutionResult(null);
    if (onCodeChange) onCodeChange(defaultCode, language);
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Sample Algorithms Presets
  function loadPreset(type) {
    let presetCode = '';
    if (language === 'python') {
      if (type === 'kondisi') {
        presetCode = `# Program Penentuan Kelulusan Siswa
nilai = 82

print(f"Nilai Siswa: {nilai}")
if nilai >= 75:
    print("Status: LULUS (Memenuhi Kriteria Ketuntasan)")
else:
    print("Status: REMEDIAL (Belum Memenuhi KKM)")`;
      } else if (type === 'loop') {
        presetCode = `# Program Mencetak Bilangan Genap 1 - 20
print("--- Bilangan Genap 1 sampai 20 ---")
for angka in range(1, 21):
    if angka % 2 == 0:
        print(f"Angka: {angka}")`;
      } else if (type === 'array') {
        presetCode = `# Program Menghitung Rata-rata Nilai Siswa
daftar_nilai = [80, 85, 90, 75, 95]

total = sum(daftar_nilai)
rata_rata = total / len(daftar_nilai)

print(f"Daftar Nilai: {daftar_nilai}")
print(f"Total Nilai: {total}")
print(f"Rata-rata: {rata_rata:.2f}")`;
      }
    } else {
      // C++ Presets
      if (type === 'kondisi') {
        presetCode = `#include <iostream>
using namespace std;

int main() {
    int nilai = 82;
    cout << "Nilai Siswa: " << nilai << endl;
    
    if (nilai >= 75) {
        cout << "Status: LULUS (Memenuhi KKM)" << endl;
    } else {
        cout << "Status: REMEDIAL" << endl;
    }
    
    return 0;
}`;
      } else if (type === 'loop') {
        presetCode = `#include <iostream>
using namespace std;

int main() {
    cout << "--- Bilangan Genap 1 sampai 20 ---" << endl;
    for (int i = 1; i <= 20; i++) {
        if (i % 2 == 0) {
            cout << "Angka: " << i << endl;
        }
    }
    return 0;
}`;
      } else if (type === 'array') {
        presetCode = `#include <iostream>
using namespace std;

int main() {
    int nilai[] = {80, 85, 90, 75, 95};
    int n = 5;
    int total = 0;
    
    for (int i = 0; i < n; i++) {
        total += nilai[i];
    }
    
    double rataRata = (double)total / n;
    cout << "Total Nilai: " << total << endl;
    cout << "Rata-rata: " << rataRata << endl;
    
    return 0;
}`;
      }
    }

    if (presetCode) {
      setCode(presetCode);
      setExecutionResult(null);
      if (onCodeChange) onCodeChange(presetCode, language);
    }
  }

  // Calculate line numbers
  const lineCount = Math.max(code.split('\n').length, 8);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 'var(--radius-lg, 12px)',
      overflow: 'hidden',
      border: '1.5px solid #334155',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      marginBottom: 20
    }}>
      {/* Top Bar Header */}
      <div style={{
        background: '#1e293b',
        padding: '12px 18px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Code2 size={16} color="#38bdf8" /> {title}
          </span>
        </div>

        {/* Language Tabs & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Language Toggle */}
          <div style={{ display: 'inline-flex', background: '#0f172a', borderRadius: 8, padding: 3, border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => handleLanguageChange('python')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: language === 'python' ? '#0284c7' : 'transparent',
                color: language === 'python' ? 'white' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🐍 Python 3
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('cpp')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: language === 'cpp' ? '#0284c7' : 'transparent',
                color: language === 'cpp' ? 'white' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⚡ C++ (GCC)
            </button>
          </div>

          {/* Presets Dropdown */}
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#334155', color: '#e2e8f0', border: 'none', fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => loadPreset('kondisi')}
              title="Muat contoh percabangan if-else"
            >
              If-Else
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#334155', color: '#e2e8f0', border: 'none', fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => loadPreset('loop')}
              title="Muat contoh perulangan for"
            >
              Loop
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#334155', color: '#e2e8f0', border: 'none', fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => loadPreset('array')}
              title="Muat contoh kalkulasi array"
            >
              Array
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', fontSize: '0.75rem', padding: '4px 8px' }}
            onClick={handleReset}
            title="Reset kode ke template awal"
          >
            <RotateCcw size={13} />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: 'transparent', color: copied ? '#4ade80' : '#94a3b8', border: '1px solid #475569', fontSize: '0.75rem', padding: '4px 8px' }}
            onClick={handleCopy}
            title="Salin kode ke clipboard"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div style={{ display: 'flex', position: 'relative', background: '#0b1120', minHeight: height }}>
        {/* Line Numbers */}
        <div style={{
          width: 44,
          background: '#090d16',
          borderRight: '1px solid #1e293b',
          color: '#475569',
          fontFamily: 'Consolas, "Fira Code", monospace',
          fontSize: '0.85rem',
          lineHeight: '1.6rem',
          textAlign: 'right',
          padding: '12px 8px 12px 0',
          userSelect: 'none'
        }}>
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Code Input Textarea */}
        <textarea
          style={{
            flex: 1,
            background: 'transparent',
            color: '#f8fafc',
            border: 'none',
            outline: 'none',
            padding: '12px 16px',
            fontFamily: 'Consolas, "Fira Code", monospace',
            fontSize: '0.88rem',
            lineHeight: '1.6rem',
            resize: 'vertical',
            whiteSpace: 'pre',
            overflowX: 'auto',
            tabSize: 4
          }}
          value={code}
          onChange={(e) => handleCodeTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck="false"
          placeholder={`// Tuliskan kode program ${LANGUAGE_CONFIG[language]?.name} Anda di sini...`}
        />
      </div>

      {/* Control Strip & Stdin Input */}
      <div style={{
        background: '#1e293b',
        padding: '10px 18px',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setShowStdin(!showStdin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            📥 {showStdin ? 'Sembunyikan Input (stdin)' : 'Beri Masukan / Input Program (cin / input())'}
          </button>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Shortcut: <kbd style={{ background: '#334155', padding: '2px 5px', borderRadius: 4, color: '#f1f5f9' }}>Ctrl + Enter</kbd>
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleRunCode}
          disabled={isRunning}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 800,
            fontSize: '0.85rem',
            padding: '8px 18px',
            background: isRunning ? '#64748b' : '#059669',
            borderColor: '#059669',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)'
          }}
        >
          <Play size={15} fill="white" />
          {isRunning ? 'Mengompilasi & Menjalankan...' : 'Jalankan Kode (Run)'}
        </button>
      </div>

      {/* Stdin Drawer */}
      {showStdin && (
        <div style={{ background: '#0b1120', padding: '10px 18px', borderTop: '1px dashed #334155' }}>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
            Input Standar (stdin) - Tiap baris mewakili 1 masukan program:
          </label>
          <textarea
            rows={2}
            style={{
              width: '100%',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: 6,
              padding: '6px 10px',
              fontFamily: 'monospace',
              fontSize: '0.82rem'
            }}
            placeholder="Ketik data masukan untuk program di sini..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
          />
        </div>
      )}

      {/* Output Console / Terminal */}
      {executionResult && (
        <div style={{
          background: '#090d16',
          borderTop: '1px solid #334155',
          padding: '14px 18px',
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Terminal Title & Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={15} color="#38bdf8" /> Output Konsol / Terminal:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {executionResult.time && (
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {executionResult.time}
                </span>
              )}
              {executionResult.success ? (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#4ade80',
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <CheckCircle2 size={13} /> {executionResult.status || 'Berhasil'}
                </span>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertTriangle size={13} /> {executionResult.status || 'Error'}
                </span>
              )}
            </div>
          </div>

          {/* Error Alert Box if any */}
          {!executionResult.success && executionResult.error && (
            <div style={{
              background: '#450a0a',
              border: '1px solid #991b1b',
              borderRadius: 6,
              padding: '10px 14px',
              color: '#fecaca',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              marginBottom: 10,
              fontFamily: 'Consolas, monospace',
              whiteSpace: 'pre-line'
            }}>
              <strong style={{ color: '#f87171', display: 'block', marginBottom: 4 }}>
                ⚠️ Peringatan: Terjadi Kesalahan pada Kode Program Anda!
              </strong>
              {executionResult.error}
            </div>
          )}

          {/* Standard Output (stdout) */}
          <pre style={{
            margin: 0,
            color: executionResult.stdout ? '#f8fafc' : '#64748b',
            fontFamily: 'Consolas, "Fira Code", monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: 220,
            overflowY: 'auto'
          }}>
            {executionResult.stdout || (executionResult.success ? '(Program selesai tanpa output teks)' : '')}
          </pre>
        </div>
      )}
    </div>
  );
}

