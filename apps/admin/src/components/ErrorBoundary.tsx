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
        <div className="min-h-screen bg-[#0B1320] text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="w-full max-w-md bg-[#131C2E] border border-[#7B3DFF]/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <h1 className="text-xl font-bold text-rose-400 mb-4 font-arabic">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-sm text-slate-300 mb-4 font-arabic">
              يبدو أن هناك مشكلة أثناء تشغيل التطبيق. رسالة الخطأ:
            </p>
            <div className="bg-[#0B1320] text-left p-3 rounded-xl text-red-300 font-mono text-xs overflow-auto max-h-48 mb-6 border border-[#7B3DFF]/10">
              {this.state.errorStr}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#7B3DFF] hover:bg-[#682edf] w-full py-3 rounded-2xl text-white font-bold transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(123,61,255,0.35)] font-arabic"
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
