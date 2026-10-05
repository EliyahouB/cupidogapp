import React, { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, getDocs, Timestamp
} from 'firebase/firestore'
import { db } from '../App'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'

function fmt(date) {
  return date.toISOString().slice(0, 10)
}

function generateDates(start, end) {
  const dates = []
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(fmt(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function tsToDate(val) {
  if (!val) return null
  if (val.toDate) return val.toDate()
  if (val instanceof Date) return val
  if (val.seconds) return new Date(val.seconds * 1000)
  if (typeof val === 'string') return new Date(val)
  return null
}

function defaultStart() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return fmt(d)
}

function defaultEnd() {
  return fmt(new Date())
}

export default function BilanPage() {
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [adsClicks, setAdsClicks] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [countData, setCountData] = useState([])
  const [amountData, setAmountData] = useState([])

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return
    setLoading(true)
    setError(null)
    try {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const startTs = Timestamp.fromDate(start)
      const endTs = Timestamp.fromDate(end)

      const dates = generateDates(start, end)
      const countMap = {}
      const amountMap = {}
      dates.forEach(d => {
        countMap[d] = { date: d, users: 0, leads: 0, pro: 0, userSub: 0, orders: 0 }
        amountMap[d] = { date: d, shopRevenue: 0, cupiRevenue: 0 }
      })

      const [profilesSnap, leadsSnap, proSnap, invoicesSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'profiles'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs))),
        getDocs(query(collection(db, 'marketplace_leads'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs))),
        getDocs(query(collection(db, 'professional_accounts'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs))),
        getDocs(query(collection(db, 'invoices'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs))),
        getDocs(query(collection(db, 'marketplace_orders'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs))),
      ])

      profilesSnap.forEach(doc => {
        const d = tsToDate(doc.data().createdAt)
        if (d && countMap[fmt(d)]) countMap[fmt(d)].users++
      })

      leadsSnap.forEach(doc => {
        const d = tsToDate(doc.data().createdAt)
        if (d && countMap[fmt(d)]) countMap[fmt(d)].leads++
      })

      proSnap.forEach(doc => {
        const d = tsToDate(doc.data().createdAt)
        if (d && countMap[fmt(d)]) countMap[fmt(d)].pro++
      })

      invoicesSnap.forEach(doc => {
        const data = doc.data()
        if (data.type === 'subscription') {
          const d = tsToDate(data.createdAt)
          if (d && countMap[fmt(d)]) countMap[fmt(d)].userSub++
        }
      })

      ordersSnap.forEach(doc => {
        const data = doc.data()
        const d = tsToDate(data.paidAt) || tsToDate(data.createdAt)
        if (d) {
          const key = fmt(d)
          if (countMap[key]) countMap[key].orders++
          if (amountMap[key]) {
            const total = parseFloat(data.total || data.amount || 0)
            amountMap[key].shopRevenue = Math.round((amountMap[key].shopRevenue + total) * 100) / 100
            amountMap[key].cupiRevenue = Math.round((amountMap[key].cupiRevenue + total * 0.15) * 100) / 100
          }
        }
      })

      setCountData(dates.map(d => countMap[d]))
      setAmountData(dates.map(d => amountMap[d]))
    } catch (err) {
      console.error('BilanPage error:', err)
      setError('Erreur de chargement. Vérifiez les index Firestore.')
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  const totalUsers = countData.reduce((s, d) => s + d.users, 0)
  const totalLeads = countData.reduce((s, d) => s + d.leads, 0)
  const totalPro = countData.reduce((s, d) => s + d.pro, 0)
  const totalUserSub = countData.reduce((s, d) => s + d.userSub, 0)
  const totalOrders = countData.reduce((s, d) => s + d.orders, 0)
  const totalShop = amountData.reduce((s, d) => s + d.shopRevenue, 0)
  const totalCupi = amountData.reduce((s, d) => s + d.cupiRevenue, 0)

  return (
    <div>
      <h1 style={s.h1}>Bilan</h1>

      {/* Filtres */}
      <div style={s.filters}>
        <div style={s.filterGroup}>
          <label style={s.label}>Du</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
            style={s.dateInput}
          />
        </div>
        <div style={s.filterGroup}>
          <label style={s.label}>Au</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={fmt(new Date())}
            onChange={e => setEndDate(e.target.value)}
            style={s.dateInput}
          />
        </div>
        <button onClick={fetchData} style={s.refreshBtn} disabled={loading}>
          {loading ? '...' : 'Actualiser'}
        </button>
        <div style={s.filterGroup}>
          <label style={s.label}>Clics Google Ads <span style={s.manualBadge}>manuel</span></label>
          <input
            type="number"
            value={adsClicks}
            min="0"
            onChange={e => setAdsClicks(e.target.value)}
            placeholder="0"
            style={{ ...s.dateInput, width: 110 }}
          />
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <div style={s.loader}>Chargement des données...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            <KPI label="Nouveaux utilisateurs" value={totalUsers} color="#4361EE" icon="👤" />
            <KPI label="Leads générés" value={totalLeads} color="#F72585" icon="📞" />
            <KPI label="Comptes PRO" value={totalPro} color="#3A0CA3" icon="✅" />
            <KPI label="Abonnements users" value={totalUserSub} color="#7209B7" icon="⭐" />
            <KPI label="Commandes shop" value={totalOrders} color="#4CC9F0" icon="🛒" />
            <KPI label="Revenu shop total" value={`₪${Math.round(totalShop)}`} color="#06D6A0" icon="💵" />
            <KPI label="Revenu CupiDog (15%)" value={`₪${Math.round(totalCupi)}`} color="#FF6B6B" icon="🏦" />
            {adsClicks !== '' && (
              <KPI label="Clics Google Ads" value={parseInt(adsClicks || 0).toLocaleString('fr-FR')} color="#F77F00" icon="📢" />
            )}
          </div>

          {/* Graphique activité */}
          <div style={s.chartCard}>
            <h2 style={s.chartTitle}>Activité — nombre par jour</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={countData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={d => d.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} width={30} />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                  labelFormatter={d => `📅 ${d}`}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="users" name="Nouveaux utilisateurs" stroke="#4361EE" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="leads" name="Leads générés" stroke="#F72585" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pro" name="Comptes PRO" stroke="#3A0CA3" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="userSub" name="Abonnements users" stroke="#7209B7" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="orders" name="Commandes shop" stroke="#4CC9F0" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique revenus */}
          <div style={{ ...s.chartCard, marginTop: 24 }}>
            <h2 style={s.chartTitle}>Revenus shop — ₪ par jour</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={amountData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={d => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => `₪${v}`} width={60} />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                  labelFormatter={d => `📅 ${d}`}
                  formatter={v => `₪${v.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="shopRevenue" name="Revenu shop total" stroke="#06D6A0" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="cupiRevenue" name="Revenu CupiDog (15%)" stroke="#FF6B6B" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p style={s.note}>
            * Boosts non tracés en base de données. Google Ads en saisie manuelle.
          </p>
        </>
      )}
    </div>
  )
}

function KPI({ label, value, color, icon }) {
  return (
    <div style={{ ...s.kpiCard, borderTop: `4px solid ${color}` }}>
      <div style={s.kpiIcon}>{icon}</div>
      <div style={{ ...s.kpiValue, color }}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
    </div>
  )
}

const s = {
  h1: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 24,
  },
  filters: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: 28,
    background: '#fff',
    borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  manualBadge: {
    marginLeft: 6,
    background: '#FEF3C7',
    color: '#92400E',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 4,
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a2e',
    background: '#F9FAFB',
    outline: 'none',
  },
  refreshBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  loader: {
    textAlign: 'center',
    padding: 60,
    color: '#6B7280',
    fontSize: 15,
  },
  errorBox: {
    background: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 28,
  },
  kpiCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px 14px',
    textAlign: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  kpiIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.3,
  },
  chartCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 20,
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'right',
    fontStyle: 'italic',
  },
}
