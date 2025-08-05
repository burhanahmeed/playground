import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import moment from "moment";
import "moment-timezone";

// We'll load the editor dynamically

export function meta() {
  return [
    { title: "Moment.js Code Playground" },
    { name: "description", content: "Interactive code playground for Moment.js API with autocomplete and live execution" },
  ];
}

const DEFAULT_CODE = `// Welcome to the Moment.js Playground!
// Write your Moment.js code here and see the results instantly

// Basic usage
const now = moment();
console.log('Current time:', now.format('YYYY-MM-DD HH:mm:ss'));

// Timezone conversion
const utc = moment.utc();
const tokyo = utc.tz('Asia/Tokyo');
console.log('Tokyo time:', tokyo.format('YYYY-MM-DD HH:mm:ss z'));

// Date manipulation
const tomorrow = moment().add(1, 'day');
console.log('Tomorrow:', tomorrow.format('dddd, MMMM Do YYYY'));

// Return the final result to display
return {
  current: now.format('LLLL'),
  tokyo: tokyo.format('LLLL'),
  tomorrow: tomorrow.format('LLLL')
};`;

const EXAMPLES = [
  {
    title: "Basic Usage",
    code: `const now = moment();
console.log('ISO:', now.toISOString());
console.log('Unix:', now.unix());
return now.format('LLLL');`
  },
  {
    title: "Timezone Conversion",
    code: `const utc = moment.utc();
const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
const times = timezones.map(tz => ({
  timezone: tz,
  time: utc.clone().tz(tz).format('YYYY-MM-DD HH:mm:ss z')
}));
return times;`
  },
  {
    title: "Date Math",
    code: `const base = moment('2024-01-01');
return {
  original: base.format('YYYY-MM-DD'),
  plus30Days: base.clone().add(30, 'days').format('YYYY-MM-DD'),
  startOfMonth: base.clone().startOf('month').format('YYYY-MM-DD')
};`
  }
];

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<any>(null);
  const editorRef = useRef<any>(null);

  const executeCode = async () => {
    setError('');
    setOutput('');
    setResult(null);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const func = new AsyncFunction('moment', code);
      const executionResult = await func(moment);
      
      setOutput(logs.join('\n'));
      setResult(executionResult);
    } catch (err: any) {
      setError(err.message || 'Execution error');
    } finally {
      console.log = originalLog;
    }
  };

  const loadExample = (exampleCode: string) => {
    setCode(exampleCode);
    if (editorRef.current) {
      editorRef.current.setValue(exampleCode);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true
    });

    setTimeout(executeCode, 500);
  };

  // Load Monaco Editor dynamically on client side
  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import Monaco Editor
    import('@monaco-editor/react').then((module) => {
      setEditorComponent(() => module.default);
    }).catch((err) => {
      console.error('Failed to load Monaco Editor:', err);
    });
  }, []);

  // Auto-execute code when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim()) {
        executeCode();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Moment.js Code Playground</h1>
            <Link
              to="/pomodoro"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              🍅 Pomodoro Tracker
            </Link>
          </div>
          <p className="text-gray-600">Write, test, and explore Moment.js API with autocomplete and live execution</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
                <h2 className="text-lg font-semibold">Code Editor</h2>
                <div className="flex gap-2">
                  <button
                    onClick={executeCode}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
                  >
                    Run Code
                  </button>
                  <button
                    onClick={() => loadExample(DEFAULT_CODE)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="h-96">
                {isClient && EditorComponent ? (
                  <EditorComponent
                    height="100%"
                    defaultLanguage="typescript"
                    value={code}
                    onChange={(value: string | undefined) => setCode(value || '')}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      quickSuggestions: true
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-800 text-white">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Loading Editor...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {output && (
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Console Output</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-auto max-h-32 font-mono border">{output}</pre>
              </div>
            )}

            {result !== null && (
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Result</h3>
                <pre className="bg-blue-900 text-blue-100 p-4 rounded-md text-sm overflow-auto max-h-32 font-mono border">
                  {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
                </pre>
              </div>
            )}

            {error && (
              <div className="bg-white rounded-lg shadow-md p-4 border border-red-200">
                <h3 className="text-lg font-semibold mb-3 text-red-700">Error</h3>
                <pre className="bg-red-900 text-red-100 p-4 rounded-md text-sm font-mono border border-red-300">{error}</pre>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Examples</h3>
              <div className="space-y-2">
                {EXAMPLES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(example.code)}
                    className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 hover:border-blue-300 border border-gray-200 rounded-md text-sm font-medium text-gray-800 transition-colors duration-200"
                  >
                    {example.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
