'use client';

import Image from 'next/image';
import { ArrowLeft, Globe, Instagram, Twitter, Download, Tv, CheckCircle2, Github } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function DeveloperPage() {
  const router = useRouter();
  const { isInstallable, installPWA } = usePWAInstall();

  return (
    <main className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md pt-6 pb-4 px-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium text-white">Tentang</h1>
      </div>

      <div className="px-6 pt-6">
        <h2 className="text-[#4ADE80] text-sm font-medium mb-8">Lead Developer</h2>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Blob Avatar */}
          <div className="relative w-48 h-48 mb-2">
            <div className="absolute inset-0 bg-[#1A2E23] rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%] animate-[blob_8s_ease-in-out_infinite] scale-110" />
            <div className="absolute inset-0 bg-[#224032] rounded-[60%_40%_30%_70%_/_50%_60%_40%_50%] animate-[blob_8s_ease-in-out_infinite_reverse] scale-105" />
            <div className="relative w-full h-full rounded-[50%_50%_40%_60%_/_60%_40%_50%_50%] overflow-hidden border-2 border-[#4ADE80]/20 z-10">
              <Image 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`}
                alt="safe_rill" 
                fill 
                sizes="192px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-white">safe_rill</h2>
            <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-500/20" />
          </div>

          <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
            Platform streaming musik modern gratis tanpa iklan. Nikmati jutaan lagu, buat daftar putar Anda sendiri, dan temukan musik baru setiap hari dengan kualitas audio premium tanpa batasan.
          </p>

          {/* Social Links Grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-4">
            <a href="https://github.com/saferill" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <Github className="w-6 h-6 text-white" />
              <span className="text-[10px] text-white/70 font-medium">GitHub</span>
            </a>
            <a href="https://instagram.com/safe_rill" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <Instagram className="w-6 h-6 text-white" />
              <span className="text-[10px] text-white/70 font-medium">Instagram</span>
            </a>
          </div>

          {/* Download APK / Install PWA */}
          <button 
            onClick={installPWA}
            className="w-full max-w-sm flex items-center justify-center gap-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white font-medium py-4 px-6 rounded-2xl transition-colors border border-white/5"
          >
            <Download className="w-5 h-5" />
            <span>Download APK</span>
          </button>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
          67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
        }
      `}</style>
    </main>
  );
}
