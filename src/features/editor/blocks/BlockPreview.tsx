import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BlockData, ChartBlockData } from './note-blocks';

const colors = ['#5683c4', '#b279a2', '#59a89c', '#e2a14a', '#d46c79', '#8c8cc4'];
export function ChartGraphic({ data, fixed = false }: { data: ChartBlockData; fixed?: boolean }) {
  const rows = data.rows.map(r => Object.fromEntries([['label', r.label], ...r.values.map((v, i) => [`s${i}`, v])]));
  const size = { width: 640, height: 280 };
  const chart = data.type === 'pie' ? (
    <PieChart {...size}><Pie data={rows} dataKey="s0" nameKey="label" cx="50%" cy="50%" outerRadius={95} isAnimationActive={false}>{rows.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie>{!fixed && <Tooltip />}<Legend /></PieChart>
  ) : data.type === 'bar' ? (
    <BarChart {...size} data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis />{!fixed && <Tooltip />}<Legend />{data.series.map((s, i) => <Bar key={i} dataKey={`s${i}`} name={s.name} fill={s.color} isAnimationActive={false} />)}</BarChart>
  ) : (
    <LineChart {...size} data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis />{!fixed && <Tooltip />}<Legend />{data.series.map((s, i) => <Line key={i} dataKey={`s${i}`} name={s.name} stroke={s.color} isAnimationActive={false} />)}</LineChart>
  );
  return fixed ? chart : <div className="h-70 w-full text-xs"><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div>;
}
export function DataTable({ rows, headers }: { rows: (string | number)[][]; headers?: string[] }) {
  return <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-xs">
    {headers && <thead><tr>{headers.map((h, i) => <th className="border border-line p-2 font-semibold" key={i} scope="col">{h}</th>)}</tr></thead>}
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td className="max-w-60 truncate border border-line p-2" key={j}>{v || (v === 0 ? '0' : '\u00a0')}</td>)}</tr>)}</tbody>
  </table></div>;
}
export default function BlockPreview({ data }: { data: BlockData }) {
  return <div><p className="mb-2 font-semibold">{data.title}</p>{'series' in data ? <>
    <ChartGraphic data={data} />
    <details><summary className="cursor-pointer text-sm text-muted">Datos de la gráfica</summary><DataTable headers={['Etiqueta', ...data.series.map(s => s.name)]} rows={data.rows.map(r => [r.label, ...r.values])} /></details>
  </> : <><p className="mb-2 text-xs text-muted">{data.preview.sheetName} · Vista previa parcial (10 filas × 6 columnas)</p><DataTable rows={data.preview.rows} /></>}</div>;
}
