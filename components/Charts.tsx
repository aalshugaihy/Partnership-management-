'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, RadialBarChart, RadialBar,
  LineChart, Line
} from 'recharts'

const COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export function BarChartCard({ data, xKey, yKey, height = 240 }: any) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} reversed />
        <YAxis tick={{ fontSize: 12 }} orientation="right" />
        <Tooltip />
        <Bar dataKey={yKey} fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PieChartCard({ data, nameKey, valueKey, height = 240 }: any) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} outerRadius={90} label>
          {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TrendChart({ data, height = 240 }: { data: any[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} reversed />
        <YAxis tick={{ fontSize: 12 }} orientation="right" />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="مفعّلة" stroke="#10b981" strokeWidth={2} />
        <Line type="monotone" dataKey="نسبة الرد" stroke="#2563eb" strokeWidth={2} />
        <Line type="monotone" dataKey="متوسط التفعيل" stroke="#f59e0b" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ActivationGauge({ value }: { value: number }) {
  const data = [{ name: 'تفعيل', value, fill: value > 60 ? '#10b981' : value > 30 ? '#f59e0b' : '#ef4444' }]
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadialBarChart innerRadius="65%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
        <RadialBar dataKey="value" cornerRadius={12} background />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}
