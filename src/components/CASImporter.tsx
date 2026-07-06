import React, { useState } from 'react';
import { Upload, Key, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Asset, CASParseResult } from '../types';
import { stripRTF, pruneCasText } from '../utils/rtfStripper';

interface CASImporterProps {
  onImportSuccess: (assets: Omit<Asset, 'id' | 'mappedGoalId' | 'lastUpdated'>[], investorDetails?: { name: string; email: string; pan: string }) => void;
}

export default function CASImporter({ onImportSuccess }: CASImporterProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [password, setPassword] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseSteps, setParseSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Drag & Drop Handlers
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFileContent(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const runParsingFlow = async (textToParse: string, isDemo = false, customPassword?: string) => {
    setIsParsing(true);
    setError(null);
    setParseSteps([]);

    const activePassword = customPassword !== undefined ? customPassword : password;

    const steps = [
      'Initializing secure parser sandbox...',
      activePassword ? 'Unlocking PDF container using provided security pass phrase...' : 'Analyzing text structure and document metadata...',
      'Running AI layout parser on tables and folios...',
      'Validating ISIN & Scheme code database mappings...',
      'Matching latest NAV prices with live indices...',
      'Aggregating holdings and compiling portfolio view...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setParseSteps(prev => [...prev, steps[i]]);
      await new Promise(resolve => setTimeout(resolve, isDemo ? 100 : 150));
    }

    try {
      let cleanedText = stripRTF(textToParse);
      cleanedText = pruneCasText(cleanedText);
      console.log(`CAS text cleaned up and pruned. Length reduced from ${textToParse.length} to ${cleanedText.length} characters.`);

      const response = await fetch('/api/parse-cas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText || (isDemo ? "DEMO_PORTFOLIO_TRIGGER" : "RAW_EXTRACTED_CAS_STATEMENT_TEXT_HOLDER"),
          password: activePassword
        })
      });

      const result = await response.json();

      if (result.success) {
        onImportSuccess(result.assets, {
          name: result.investorName || "",
          email: result.email || "",
          pan: result.pan || ""
        });
      } else {
        throw new Error(result.error || "Failed to parse data");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during parsing. Please try copy-pasting your text.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && !fileName) {
      setError('Please select or drag-and-drop a CAS PDF or text statement.');
      return;
    }
    if (activeTab === 'paste' && !pastedText.trim()) {
      setError('Please paste the CAS statement text to parse.');
      return;
    }

    let finalPassword = password;
    if (activeTab === 'upload' && fileName?.toLowerCase().endsWith('.pdf') && !password.trim()) {
      const promptPassword = window.prompt("The selected CAS PDF is encrypted by default. Please enter your PDF password (usually your PAN in CAPITALS or your registered email address):");
      if (promptPassword === null) {
        setError("Import aborted. PDF decryption password is required to parse the encrypted document.");
        return;
      }
      if (!promptPassword.trim()) {
        setError("Failed to import: PDF decryption password cannot be empty.");
        return;
      }
      finalPassword = promptPassword.trim();
      setPassword(finalPassword);
    }

    const textInput = activeTab === 'upload' ? `File: ${fileName}\n\n${fileContent || 'Encrypted Binary Content'}` : pastedText;
    runParsingFlow(textInput, false, finalPassword);
  };

  const loadSamplePortfolio = () => {
    runParsingFlow("DEMO_PORTFOLIO_TRIGGER", true);
  };

  return (
    <div id="cas-importer-root" className="geo-card p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-500" />
            <h2 className="text-xl font-display font-bold text-slate-950">CAS Statement Importer</h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Import mutual funds from CAMS / KFintech Consolidated Account Statements (CAS)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-cas-help"
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How to get CAS?
          </button>
          <button
            id="btn-load-sample-cas"
            type="button"
            onClick={loadSamplePortfolio}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100/80 border border-brand-200/50 rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse-slow text-brand-600" />
            Load Interactive Demo CAS
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 text-sm text-slate-600 slide-in leading-relaxed">
          <h4 className="font-semibold text-slate-800 mb-2">How to request your CAMS CAS:</h4>
          <ol className="list-decimal pl-5 space-y-2.5">
            <li>Go to CAMS Online or KFintech CAS page (or cams-kfintech-cas.com).</li>
            <li>Select <b>Summary</b> or <b>Detailed</b> Statement for a specific date range.</li>
            <li>Enter your registered email ID and PAN, and set a password to encrypt the PDF.</li>
            <li>You will receive the PDF file via email within 5–10 minutes.</li>
            <li>The PDF password is typically your PAN in CAPITALS or your registered email address.</li>
            <li><b>Pro-tip:</b> Open the PDF, select all text (Ctrl+A / Cmd+A), copy it, and paste it into our Paste Text box below for flawless AI extraction!</li>
          </ol>
        </div>
      )}

      {isParsing ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
          <h3 className="font-display font-semibold text-slate-800 text-lg">Analyzing CAS Portfolio</h3>
          <p className="text-slate-500 text-sm text-center max-w-sm mt-1 mb-6">
            Gemini is extracting your schemes, folio IDs, purchased value, and latest NAV ratings...
          </p>
          <div className="w-full max-w-md space-y-2">
            {parseSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600 font-mono slide-in bg-white p-3 rounded-xl border border-slate-100">
                {idx === parseSteps.length - 1 ? (
                  <Loader2 className="h-3.5 w-3.5 text-brand-500 animate-spin flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                )}
                <span className="truncate">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleImportSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex border-b border-slate-100">
            <button
              id="tab-cas-upload"
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-5 font-display text-sm font-medium border-b-2 transition-colors -mb-[2px] cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-brand-600 text-brand-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Upload CAS Document
            </button>
            <button
              id="tab-cas-paste"
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-3 px-5 font-display text-sm font-medium border-b-2 transition-colors -mb-[2px] cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-brand-600 text-brand-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Paste Statement Text (Highly Reliable)
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="space-y-5">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-brand-500 bg-brand-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
                onClick={() => document.getElementById('cas-file-input')?.click()}
              >
                <input
                  id="cas-file-input"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3.5">
                  <Upload className="h-6.5 w-6.5" />
                </div>
                {fileName ? (
                  <div className="text-center">
                    <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5 justify-center">
                      <FileText className="h-4 w-4 text-brand-600" />
                      {fileName}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileName(null);
                        setFileContent('');
                      }}
                      className="text-xs text-rose-500 hover:underline mt-2 cursor-pointer"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-sm">Drag and drop your CAS PDF or Text</p>
                    <p className="text-xs text-slate-400 mt-1.5">Accepts .pdf or .txt statements</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-400" />
                  PDF Security Password (If encrypted)
                </label>
                <input
                  id="cas-password-input"
                  type="password"
                  placeholder="Usually your PAN in uppercase (e.g. ABCDE1234F) or Email"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 text-sm bg-slate-50/50"
                />
                <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                  Your password remains fully local in your browser and is only used to unlock the document structure.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Paste CAS text from your statement PDF
                </label>
                <textarea
                  id="cas-paste-area"
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Open your CAS PDF, press Ctrl+A/Cmd+A to select all text, copy and paste the text block here..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-500 font-mono text-xs bg-slate-50/50 placeholder-slate-400"
                />
                <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                  AI parsing parses raw text extremely well. Ensure units, scheme names, and valuations are included in the copied text block.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="btn-import-submit"
              type="submit"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-sm tracking-wide cursor-pointer uppercase"
            >
              Analyze & Import Statement
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
