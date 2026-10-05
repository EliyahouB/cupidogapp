import React, { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../App'

function LeadsProPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('leadsThisMonth')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let allLeads = []
    let proAccounts = {}
    let leadsLoaded = false
    let prosLoaded = false

    const tryBuild = () => {
      if (!leadsLoaded || !prosLoaded) return

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Group leads by providerId
      const grouped = {}
      allLeads.forEach((lead) => {
        const pid = lead.providerId
        if (!pid) return
        if (!grouped[pid]) {
          grouped[pid] = {
            providerId: pid,
            providerName: lead.providerName || 'Inconnu',
            leadsThisMonth: 0,
            totalThisMonth: 0,
            leadsTotal: 0,
            totalAll: 0,
          }
        }
        grouped[pid].leadsTotal += 1
        grouped[pid].totalAll += lead.leadPrice || 0

        // Check if this lead is in the current month
        let createdAt = null
        if (lead.createdAt?.toDate) {
          createdAt = lead.createdAt.toDate()
        } else if (lead.createdAt instanceof Date) {
          createdAt = lead.createdAt
        }

        if (
          createdAt &&
          createdAt.getMonth() === currentMonth &&
          createdAt.getFullYear() === currentYear
        ) {
          grouped[pid].leadsThisMonth += 1
          grouped[pid].totalThisMonth += lead.leadPrice || 0
        }
      })

      // Merge subscription info from professional_accounts
      const result = Object.values(grouped).map((row) => {
        const proData = proAccounts[row.providerId]
        const abonnement = proData?.abonnement || proData?.subscriptionPlan || null
        let abonnementLabel = 'N/A'
        if (abonnement === 'pro') abonnementLabel = 'PRO'
        else if (abonnement === 'pro_plus' || abonnement === 'pro+') abonnementLabel = 'PRO+'
        else if (abonnement) abonnementLabel = abonnement

        return {
          ...row,
          abonnement: abonnementLabel,
          category: proData?.category || proData?.providerType || '—',
          status: proData?.status || '—',
        }
      })

      setRows(result)
      setLoading(false)
    }

    const unsubLeads = onSnapshot(
      query(collection(db, 'marketplace_leads')),
      (snapshot) => {
        allLeads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        leadsLoaded = true
        tryBuild()
      },
      (error) => {
        console.error('Erreur onSnapshot marketplace_leads:', error)
        setLoading(false)
      }
    )

    const unsubPro = onSnapshot(
      query(collection(db, 'professional_accounts')),
      (snapshot) => {
        proAccounts = {}
        snapshot.docs.forEach((doc) => {
          const data = doc.data()
          // Key by userId field, or doc id
          const uid = data.userId || data.uid || doc.id
          proAccounts[uid] = data
        })
        prosLoaded = true
        tryBuild()
      },
      (error) => {
        console.error('Erreur onSnapshot professional_accounts:', error)
        prosLoaded = true
        tryBuild()
      }
    )

    return () => {
      unsubLeads()
      unsubPro()
    }
  }, [])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = rows.filter((r) =>
    r.providerName.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const totalLeadsMonth = rows.reduce((s, r) => s + r.leadsThisMonth, 0)
  const totalRevenueMonth = rows.reduce((s, r) => s + r.totalThisMonth, 0)
  const totalLeadsAll = rows.reduce((s, r) => s + r.leadsTotal, 0)

  const now = new Date()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={styles.sortIcon}>⇅</span>
    return <span style={styles.sortIcon}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const abonnementBadge = (label) => {
    if (label === 'PRO+') return { background: '#7c3aed', color: '#fff' }
    if (label === 'PRO') return { background: '#2563eb', color: '#fff' }
    return { background: '#e5e7eb', color: '#374151' }
  }

  if (loading) {
    return <div style={styles.loading}>Chargement des leads par prestataire...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>📞 Leads par prestataire</h1>
        <p style={styles.subtitle}>Synthèse mensuelle — {monthLabel}</p>
      </div>

      {/* Summary cards */}
      <div style={styles.grid3}>
        <div style={{ ...styles.card, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          <p style={styles.cardLabelWhite}>Prestataires avec leads</p>
          <p style={styles.cardValueWhite}>{rows.length}</p>
        </div>
        <div style={{ ...styles.card, background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
          <p style={styles.cardLabelWhite}>Leads ce mois</p>
          <p style={styles.cardValueWhite}>{totalLeadsMonth}</p>
        </div>
        <div style={{ ...styles.card, background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
          <p style={styles.cardLabelWhite}>Revenus ce mois</p>
          <p style={styles.cardValueWhite}>{totalRevenueMonth}₪</p>
        </div>
      </div>

      {/* Search + table */}
      <div style={styles.tableSection}>
        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Rechercher un prestataire ou catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <span style={styles.totalCount}>{sorted.length} prestataire{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        {sorted.length === 0 ? (
          <div style={styles.empty}>
            <p>Aucun prestataire trouvé</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th} onClick={() => handleSort('providerName')}>
                    Prestataire <SortIcon col="providerName" />
                  </th>
                  <th style={styles.th} onClick={() => handleSort('category')}>
                    Catégorie <SortIcon col="category" />
                  </th>
                  <th style={{ ...styles.th, textAlign: 'center' }} onClick={() => handleSort('abonnement')}>
                    Abonnement <SortIcon col="abonnement" />
                  </th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('leadsThisMonth')}>
                    Leads ce mois <SortIcon col="leadsThisMonth" />
                  </th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('totalThisMonth')}>
                    Total ce mois <SortIcon col="totalThisMonth" />
                  </th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('leadsTotal')}>
                    Leads total <SortIcon col="leadsTotal" />
                  </th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('totalAll')}>
                    Total cumulé <SortIcon col="totalAll" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={row.providerId}
                    style={{ ...styles.tr, background: i % 2 === 0 ? '#fff' : '#f9fafb' }}
                  >
                    <td style={styles.td}>
                      <span style={styles.providerName}>{row.providerName}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.category}>{row.category}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ ...styles.badge, ...abonnementBadge(row.abonnement) }}>
                        {row.abonnement}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={{
                        ...styles.count,
                        color: row.leadsThisMonth > 0 ? '#059669' : '#9ca3af'
                      }}>
                        {row.leadsThisMonth}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', color: '#1a1a2e' }}>
                      {row.totalThisMonth > 0 ? `${row.totalThisMonth}₪` : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#6b7280' }}>
                      {row.leadsTotal}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#6b7280' }}>
                      {row.totalAll > 0 ? `${row.totalAll}₪` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={styles.tfoot}>
                  <td style={styles.tdFoot} colSpan={3}>TOTAL</td>
                  <td style={{ ...styles.tdFoot, textAlign: 'right' }}>{totalLeadsMonth}</td>
                  <td style={{ ...styles.tdFoot, textAlign: 'right' }}>{totalRevenueMonth}₪</td>
                  <td style={{ ...styles.tdFoot, textAlign: 'right' }}>{totalLeadsAll}</td>
                  <td style={{ ...styles.tdFoot, textAlign: 'right' }}>
                    {rows.reduce((s, r) => s + r.totalAll, 0)}₪
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#666',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '24px',
  },
  card: {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  cardLabelWhite: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '8px',
  },
  cardValueWhite: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
  },
  tableSection: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    padding: '9px 14px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    maxWidth: '380px',
  },
  totalCount: {
    fontSize: '13px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#9ca3af',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thead: {
    background: '#f8f9fa',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #e5e7eb',
  },
  sortIcon: {
    marginLeft: '4px',
    fontSize: '11px',
    opacity: 0.6,
  },
  tr: {
    transition: 'background 0.1s',
  },
  td: {
    padding: '13px 16px',
    fontSize: '14px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  },
  tfoot: {
    background: '#1a1a2e',
  },
  tdFoot: {
    padding: '13px 16px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff',
  },
  providerName: {
    fontWeight: '600',
    color: '#1a1a2e',
  },
  category: {
    fontSize: '13px',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  count: {
    fontSize: '16px',
    fontWeight: '700',
  },
}

export default LeadsProPage
