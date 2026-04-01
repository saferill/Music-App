import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4">
      <h2 className="text-4xl font-bold mb-4">404</h2>
      <p className="text-white/60 mb-8">Halaman tidak ditemukan</p>
      <Link 
        href="/"
        className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
