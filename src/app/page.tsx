import LoginForm from "@/components/LoginForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px]" />
      
      <div className="z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">CTNC Report</h1>
          <p className="text-emerald-200/70">Hệ thống quản lý báo cáo tháng dự án CTNC</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
