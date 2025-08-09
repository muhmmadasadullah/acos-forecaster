import React, { useMemo, useState } from "react";
import { TrendingUp, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

export default function App() {
  const [adSpend, setAdSpend] = useState("300");
  const [adSales, setAdSales] = useState("1000");
  const [adClicks, setAdClicks] = useState("500");
  const [adOrders, setAdOrders] = useState("50");
  const [newCpc, setNewCpc] = useState("0.60");
  const [newCvrPct, setNewCvrPct] = useState("12");

  const toNum = (v) => parseFloat((v ?? "").toString().replace(/,/g, "")) || 0;
  const safeDiv = (num, den) => (den > 0 ? num / den : 0);

  const current = useMemo(() => {
    const spend = toNum(adSpend);
    const sales = toNum(adSales);
    const clicks = toNum(adClicks);
    const orders = toNum(adOrders);
    return {
      spend,
      sales,
      clicks,
      orders,
      acos: safeDiv(spend, sales),
      cpc: safeDiv(spend, clicks),
      cvr: safeDiv(orders, clicks),
      aov: safeDiv(sales, orders)
    };
  }, [adSpend, adSales, adClicks, adOrders]);

  const forecast = useMemo(() => {
    const cpc = toNum(newCpc);
    const cvr = toNum(newCvrPct) / 100;
    const clicks = current.clicks;
    const estOrders = clicks * cvr;
    const estSpend = clicks * cpc;
    const estSales = estOrders * (current.aov || 0);
    const newAcos = safeDiv(estSpend, estSales);
    const delta = newAcos - current.acos;
    return { cpc, cvr, clicks, estOrders, estSpend, estSales, newAcos, delta };
  }, [newCpc, newCvrPct, current]);

  const fmtPct = (v) => `${(v * 100).toFixed(2)}%`;
  const fmtMoney = (v) => `$${v.toFixed(2)}`;
  const fmtUnit = (v) => `${Math.round(v)}`;

  const chartData = useMemo(() => {
    const points = [];
    const clicks = Math.max(1, current.clicks || 0);
    const aov = current.aov || 0;
    const cpc = toNum(newCpc);
    for (let pct = 2; pct <= 30; pct += 2) {
      const cvr = pct / 100;
      const orders = clicks * cvr;
      const spend = clicks * cpc;
      const sales = orders * aov;
      const acos = safeDiv(spend, sales) * 100;
      points.push({ name: `${pct}%`, acosPct: isFinite(acos) ? acos : 0 });
    }
    return points;
  }, [current.clicks, current.aov, newCpc]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-neutral-100">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-500" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'SamsungOne, sans-serif' }}>ACoS Forecaster</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <Card title="Inputs" subtitle="White fields are editable">
            <InputField label="Ad Spend ($)" value={adSpend} onChange={setAdSpend} />
            <InputField label="Ad Sales ($)" value={adSales} onChange={setAdSales} />
            <InputField label="Ad Clicks" value={adClicks} onChange={setAdClicks} />
            <InputField label="Ad Orders" value={adOrders} onChange={setAdOrders} />
            <TargetInputs newCpc={newCpc} setNewCpc={setNewCpc} newCvrPct={newCvrPct} setNewCvrPct={setNewCvrPct} />
          </Card>
        </section>

        <section className="lg:col-span-1">
          <Card title="Current Metrics" subtitle="Calculated from your inputs">
            <MetricRow label="ACoS" value={fmtPct(current.acos)} />
            <MetricRow label="Avg CPC" value={fmtMoney(current.cpc)} />
            <MetricRow label="Ad CVR" value={fmtPct(current.cvr)} />
            <MetricRow label="Ad AOV" value={fmtMoney(current.aov)} />
          </Card>
        </section>

        <section className="lg:col-span-1">
          <Card title="Forecast" subtitle="Impact from New CPC & CVR">
            <MetricRow label="New ACoS" value={fmtPct(forecast.newAcos)} big />
            <p className="text-sm mt-2">
              Change: {(forecast.delta * 100).toFixed(2)}% — This is the percentage difference between your forecasted ACoS and current ACoS. Negative = improvement (lower ACoS), Positive = decline (higher ACoS).
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <MiniKPI label="Est. Spend" value={fmtMoney(forecast.estSpend)} />
              <MiniKPI label="Est. Orders" value={fmtUnit(forecast.estOrders)} />
              <MiniKPI label="Est. Sales" value={fmtMoney(forecast.estSales)} />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-neutral-700 leading-relaxed">
              <strong>Detailed logic:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>We keep your current click volume constant.</li>
                <li>Estimated Spend = Clicks × New CPC</li>
                <li>Estimated Orders = Clicks × New CVR</li>
                <li>Estimated Sales = Estimated Orders × Current AOV</li>
                <li>New ACoS = Estimated Spend ÷ Estimated Sales</li>
              </ul>
              This breakdown shows exactly how tweaking CPC or CVR impacts efficiency and profitability.
            </div>
          </Card>
        </section>

        <section className="lg:col-span-3">
          <Card title="Sensitivity: ACoS vs CVR" subtitle="Holding CPC at your chosen value. Higher CVR lowers ACoS.">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                  <ReferenceLine y={(current.acos || 0) * 100} strokeDasharray="3 3" stroke="#ff4d4f" />
                  <Line type="monotone" dataKey="acosPct" strokeWidth={3} stroke="#007aff" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-neutral-500">Tip: Increasing CVR or lowering CPC will bring ACoS down. The dotted line marks your current ACoS.</p>
          </Card>
        </section>
      </main>

      <footer className="border-t border-neutral-100 py-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-medium text-neutral-900">Made by Asadullah. Connect on <a href="https://www.linkedin.com/in/muhamadasadullah/" target="_blank" className="text-blue-600 hover:underline">LinkedIn</a></p>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-5">
      <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm text-neutral-600 mb-1">{label}</span>
      <input className="w-full rounded-xl border border-neutral-200 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TargetInputs({ newCpc, setNewCpc, newCvrPct, setNewCvrPct }) {
  return (
    <>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Target className="h-4 w-4" /> Forecast Inputs</h4>
      <InputField label="New CPC ($)" value={newCpc} onChange={setNewCpc} />
      <InputField label="New CVR (%)" value={newCvrPct} onChange={setNewCvrPct} />
    </>
  );
}

function MetricRow({ label, value, big = false }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className={`px-2.5 py-1 font-medium rounded-lg bg-red-50 text-red-600 ${big ? "text-base" : "text-sm"}`}>{value}</span>
    </div>
  );
}

function MiniKPI({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
