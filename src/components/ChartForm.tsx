import { useState } from 'react';
import { isChartData, parseDecimal, type ChartBlockData } from '../lib/note-blocks';
import { ChartGraphic } from './BlockPreview';

export const fieldClass = 'rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink';
export default function ChartForm({ initial, onDirty, onApply, busy }: { initial: ChartBlockData; onDirty: () => void; onApply: (data: ChartBlockData) => void; busy: boolean }) {
  const [title, setTitle] = useState(initial.title);
  const [type, setType] = useState(initial.type);
  const [series, setSeries] = useState(initial.series);
  const [rows, setRows] = useState(initial.rows.map(r => ({ label: r.label, values: r.values.map(String) })));
  const data: ChartBlockData = { version: 1, title, type, series, rows: rows.map(r => ({ label: r.label, values: r.values.map(v => parseDecimal(v) ?? NaN) })) };
  const valid = isChartData(data);
  return <div onChange={onDirty} className="space-y-4">
    <div className="flex flex-wrap gap-3"><label className="grid gap-1 text-sm">Título<input className={fieldClass} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">Tipo<select aria-label="Tipo" className={fieldClass} value={type} onChange={e => setType(e.target.value as ChartBlockData['type'])}><option value="bar">Barras</option><option value="line">Líneas</option><option value="pie">Sectores</option></select></label></div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Etiqueta</th>{series.map((s, i) => <th key={i} className="min-w-40 p-1"><input className={`${fieldClass} w-32`} aria-label={`Nombre de serie ${i + 1}`} value={s.name} onChange={e => setSeries(series.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
      <input type="color" aria-label={`Color de serie ${i + 1}`} value={s.color} onChange={e => setSeries(series.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
      {!s.name.trim() && <p className="text-xs text-red-600">Escribe un nombre.</p>}
      <button type="button" className="p-1 text-xs underline" onClick={() => { onDirty(); setSeries(series.filter((_, j) => j !== i)); setRows(rows.map(r => ({ ...r, values: r.values.filter((_, j) => j !== i) }))); }}>Eliminar serie {i + 1}</button></th>)}<th /></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td className="p-1"><input className={fieldClass} aria-label={`Etiqueta ${i + 1}`} value={r.label} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />{!r.label.trim() && <p className="text-xs text-red-600">Escribe una etiqueta.</p>}</td>
        {r.values.map((v, j) => <td key={j} className="p-1"><input className={`${fieldClass} w-32`} inputMode="decimal" aria-label={`Valor fila ${i + 1} serie ${j + 1}`} value={v} onChange={e => setRows(rows.map((x, k) => k === i ? { ...x, values: x.values.map((n, l) => l === j ? e.target.value : n) } : x))} />{parseDecimal(v) === null ? <p className="text-xs text-danger">Número no válido.</p> : type === 'pie' && parseDecimal(v)! < 0 ? <p className="text-xs text-danger">Sectores no admite valores negativos.</p> : null}</td>)}
        <td><button type="button" className="p-2 text-xs underline" onClick={() => { onDirty(); setRows(rows.filter((_, j) => j !== i)); }}>Eliminar fila {i + 1}</button></td></tr>)}</tbody></table></div>
    <div className="flex flex-wrap gap-3"><button type="button" className={fieldClass} disabled={rows.length >= 500} onClick={() => { onDirty(); setRows([...rows, { label: `Dato ${rows.length + 1}`, values: series.map(() => '0') }]); }}>Añadir fila</button>
      <button type="button" className={fieldClass} disabled={series.length >= 8} onClick={() => { onDirty(); setSeries([...series, { name: `Serie ${series.length + 1}`, color: '#59a89c' }]); setRows(rows.map(r => ({ ...r, values: [...r.values, '0'] }))); }}>Añadir serie</button></div>
    <p className="text-xs text-muted">Máximo 500 filas y 8 series. Decimales con coma o punto, sin separadores de miles.</p>
    {!valid && <p role="alert" className="text-sm text-red-600">Completa al menos una fila y una serie con nombres y números válidos.{type === 'pie' && ' Sectores requiere una sola serie, valores no negativos y alguno mayor que cero. Elimina las series sobrantes para continuar.'}</p>}
    {valid && <ChartGraphic data={data} />}
    <button type="button" className={fieldClass} disabled={!valid || busy} onClick={() => onApply(data)}>Aplicar</button>
  </div>;
}
