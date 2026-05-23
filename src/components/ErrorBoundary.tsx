import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorStr: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorStr: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorStr: error.toString() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <h1 className="text-xl font-bold text-red-400 mb-4">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-sm text-slate-300 mb-4">
              يبدو أن هناك مشكلة أثناء تشغيل التطبيق. رسالة الخطأ:
            </p>
            <div className="bg-slate-950 text-left p-3 rounded text-red-300 font-mono text-xs overflow-auto max-h-48 mb-6">
              {this.state.errorStr}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 w-full py-2 rounded-xl"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
