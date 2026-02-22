export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          © {new Date().getFullYear()} AI Content Detector. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-zinc-500 hover:text-zinc-300">Privacy Policy</a>
          <a href="#" className="text-sm text-zinc-500 hover:text-zinc-300">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
