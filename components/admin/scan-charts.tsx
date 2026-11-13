"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyCount } from "@/server/stats";

type Device = { device: string; label: string; scans: number };
type Hour = { hour: number; label: string; scans: number };
const colors = ["#047857", "#2563eb", "#9333ea", "#94a3b8"];

function TextTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return <details className="mt-4 rounded-lg border bg-slate-50 px-3 py-2 text-sm"><summary className="cursor-pointer font-medium">Lihat data sebagai tabel</summary><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left"><caption className="sr-only">{caption}</caption><thead><tr>{headers.map((header) => <th key={header} scope="col" className="px-2 py-1">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t">{row.map((cell, col) => <td key={col} className="px-2 py-1">{cell}</td>)}</tr>)}</tbody></table></div></details>;
}

export function ScanCharts({ daily, devices, hours }: { daily: DailyCount[]; devices: Device[]; hours: Hour[] }) {
  const deviceRows = devices.map((row) => [row.label, row.scans]);
  const hourRows = hours.map((row) => [row.label, row.scans]);
  return <div className="grid gap-5">
    <section className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" aria-labelledby="chart-daily-title">
      <h2 id="chart-daily-title" className="font-semibold">Scan per hari</h2><div role="img" aria-label={`Grafik scan harian dari ${daily[0]?.date ?? ""} sampai ${daily.at(-1)?.date ?? ""}`} className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={daily} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={22} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="scans" name="Scan" fill="#047857" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
      </div><TextTable caption="Jumlah scan per hari" headers={["Tanggal (WIB)", "Scan"]} rows={daily.map((row) => [row.date, row.scans])} />
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" aria-labelledby="chart-device-title"><h2 id="chart-device-title" className="font-semibold">Perangkat</h2><div role="img" aria-label="Pembagian scan menurut jenis perangkat" className="mt-3 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={devices} dataKey="scans" nameKey="label" cx="50%" cy="45%" outerRadius="70%" label>{devices.map((entry, index) => <Cell key={entry.device} fill={colors[index]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div><TextTable caption="Scan per perangkat" headers={["Perangkat", "Scan"]} rows={deviceRows} /></section>
      <section className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" aria-labelledby="chart-hour-title"><h2 id="chart-hour-title" className="font-semibold">Jam tersibuk (WIB)</h2><div role="img" aria-label="Distribusi scan menurut jam di Asia Jakarta" className="mt-3 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={hours} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="scans" name="Scan" fill="#2563eb" /></BarChart></ResponsiveContainer></div><TextTable caption="Scan per jam WIB" headers={["Jam", "Scan"]} rows={hourRows} /></section>
    </div>
  </div>;
}
