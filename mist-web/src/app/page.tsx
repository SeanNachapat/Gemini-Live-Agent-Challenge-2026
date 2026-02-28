"use client";

import React from "react";
import {
  Activity,
  Search,
  ShieldAlert,
  Video,
  Mic,
  Radio,
  User,
  AlertCircle,
  Wifi,
  CheckCircle2,
  Terminal,
  Clock,
  HeartPulse,
} from "lucide-react";

/* ──────────────────────────────────────────────
   Reusable glassmorphic panel wrapper
   ────────────────────────────────────────────── */
function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#141414] border border-neutral-800/80 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 ${className}`}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Dashboard
   ────────────────────────────────────────────── */
export default function TacticalDashboard() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-neutral-300 select-none bg-[#111111]">
      
      {/* ═══════════════════════════════════════
          1. TOP HEADER (Global Command)
          ═══════════════════════════════════════ */}
      <header className="h-14 shrink-0 bg-[#111111] border-b border-neutral-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h1 className="text-lg font-bold tracking-wide text-neutral-200">
            MIST
          </h1>
          <span className="mx-3 w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500  " />
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
              Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-red-500 font-bold ">
            SM
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-neutral-300 leading-tight">S. Martinez</span>
            <span className="text-[10px] uppercase tracking-wider leading-tight">Dispatcher</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          MAIN CONTENT GRID (3 Columns)
          ═══════════════════════════════════════ */}
      <main className="flex-1 flex gap-4 p-4 min-h-0 z-10 relative">
        
        {/* Removed ambient glows for a sharper UI */}

        {/* ─── LEFT COLUMN: Active Cases (20%) ─── */}
        <section className="w-[20%] min-w-[300px] flex flex-col h-full gap-4">
          <GlassPanel className="flex-1">
            <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-800/20">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500" />
                Active Cases
                <span className="ml-auto bg-zinc-700 text-neutral-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  0
                </span>
              </h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search units/cases..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950/50 border border-neutral-800 rounded-md text-xs text-neutral-300 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition"
                />
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col items-center justify-center text-neutral-600">
              <Radio className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-xs font-mono uppercase tracking-widest">No Active Cases</p>
            </div>
          </GlassPanel>
        </section>

        {/* ─── CENTER COLUMN: Live Multimodal Overwatch (50%) ─── */}
        <section className="w-[50%] flex flex-col h-full gap-4">
          
          {/* Top Half: Live Bodycam Feed */}
          <GlassPanel className="flex-3 relative bg-black border-neutral-800">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm z-10 flex justify-between items-start pointer-events-none">
              <div className="flex items-center gap-2 bg-black/80 border border-neutral-800 pl-2 pr-3 py-1.5 rounded-md opacity-50">
                <span className="w-2 h-2 rounded-full bg-neutral-600 " />
                <span className="text-xs font-bold text-neutral-400 tracking-wider">OFFLINE</span>
              </div>
              <div className="bg-black/80 border border-neutral-800 px-3 py-1.5 rounded-md text-xs font-mono text-neutral-600">
                STANDBY
              </div>
            </div>

            {/* Video Placeholder */}
            <div className="absolute inset-0 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
               <Video className="w-16 h-16 text-neutral-800 relative z-0" />
            </div>

            {/* Bottom Overlay: AI Listening Waveform */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
               <div className="bg-black/80 border border-neutral-800 rounded-xl px-6 py-3 flex items-center gap-4 opacity-50">
                 <div className="flex items-center gap-2">
                   <Wifi className="w-4 h-4 text-neutral-600" />
                   <span className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Gemini Standby</span>
                 </div>
               </div>
            </div>
          </GlassPanel>

          {/* Bottom Half: Raw AI Teletype */}
          <GlassPanel className="flex-2 bg-[#0A0A0A] border-neutral-800/80 relative">
            <div className="px-4 py-3 border-b border-neutral-800/80 bg-[#141414] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-500 opacity-80" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Raw Scene Transcript</h3>
              </div>
              <span className="text-[9px] bg-red-500/5 text-red-500/80 border border-red-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Model: Gemini 1.5 Pro
              </span>
            </div>
            
            <div className="flex-1 p-4 overflow-hidden relative group">
              <div className="h-full font-mono text-xs flex items-center justify-center text-neutral-600/50 animate-pulse">
                [ Awaiting audio telemetry... ]
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ─── RIGHT COLUMN: AI Structured Data & Vitals (30%) ─── */}
        <section className="w-[30%] min-w-[340px] flex flex-col h-full gap-4">
          <GlassPanel className="flex-4 flex flex-col">
            <div className="px-5 py-4 border-b border-neutral-800/80 flex items-center gap-2 bg-[#141414]">
              <Activity className="w-4 h-4 text-red-500 opacity-80" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                AI Extracted Telemetry
              </h2>
            </div>

            {/* Top Section: Live Vitals Grid */}
            <div className="p-5 border-b border-neutral-800/80 bg-[#141414]">
              <div className="grid grid-cols-2 gap-4">
                {/* HR */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center justify-between">
                    Heart Rate <HeartPulse className="w-3.5 h-3.5 opacity-40" />
                  </p>
                  <p className="text-4xl font-black text-neutral-700">
                    00
                    <span className="text-sm font-bold ml-1 text-neutral-800">bpm</span>
                  </p>
                </div>
                {/* BP */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                    Blood Pressure
                  </p>
                  <p className="text-4xl font-black text-neutral-700">
                    00<span className="text-xl text-neutral-800 mx-1">/</span>00
                  </p>
                </div>
                {/* SpO2 */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                    SpO2
                  </p>
                  <p className="text-4xl font-black text-neutral-700">
                    00<span className="text-xl font-bold ml-1 text-neutral-800">%</span>
                  </p>
                </div>
                {/* GCS */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                    GCS
                  </p>
                  <p className="text-4xl font-black text-neutral-700">
                    00<span className="text-sm font-bold ml-1 text-neutral-800">/15</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Section: Verified Timeline */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#111111]">
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Clinical Actions Log
                </h3>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-neutral-600">
                <Clock className="w-6 h-6 mb-3 opacity-20" />
                <p className="text-xs font-mono uppercase tracking-widest">No Log Entries</p>
              </div>
            </div>
          </GlassPanel>
        </section>

      </main>

      {/* ═══════════════════════════════════════
          Custom Styles
          ═══════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes waveform1 {
          0%, 100% { height: 30%; }
          50% { height: 90%; }
        }
        @keyframes waveform2 {
          0%, 100% { height: 70%; }
          50% { height: 20%; }
        }
        @keyframes waveform3 {
          0%, 100% { height: 50%; }
          50% { height: 100%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
    </div>
  );
}
