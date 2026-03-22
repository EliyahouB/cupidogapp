import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../App'

function FacturesPage() {
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFactures(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatMoney = (amount) => {
    return `${amount || 0}₪`
  }

  const getTypeBadge = (type) => {
    const styles = {
      subscription: { background: '#007bff', label: 'Abonnement' },
      lead: { background: '#FFA500', label: 'Lead' },
      commission: { background: '#28a745', label: 'Commission' },
    }
    const s = styles[type] || { background: '#666', label: type }
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: s.background,
        color: '#fff',
      }}>
        {s.label}
      </span>
    )
  }

  const filteredFactures = filter === 'all'
    ? factures
    : factures.filter(f => f.type === filter)

  // Calculs totaux
  const totalAbonnements = factures
    .filter(f => f.type === 'subscription')
    .reduce((sum, f) => sum + (f.amount || 0), 0)
  
  const totalLeads = factures
    .filter(f => f.type === 'lead')
    .reduce((sum, f) => sum + (f.amount || 0), 0)

  const totalCommissions = factures
    .filter(f => f.type === 'commission')
    .reduce((sum, f) => sum + (f.amount || 0), 0)

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Factures</h1>
        <p style={styles.subtitle}>Historique des paiements et prélèvements</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <p style={styles.statLabel}>Abonnements PRO</p>
            <p style={styles.statValue}>{formatMoney(totalAbonnements)}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📞</div>
          <div>
            <p style={styles.statLabel}>Leads prestataires</p>
            <p style={styles.statValue}>{formatMoney(totalLeads)}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div>
            <p style={styles.statLabel}>Commissions vendeurs</p>
            <p style={styles.statValue}>{formatMoney(totalCommissions)}</p>
          </div>
        </div>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'}}>
          <div style={styles.statIcon}>🏆</div>
          <div>
            <p style={{...styles.statLabel, color: 'rgba(255,255,255,0.8)'}}>Total encaissé</p>
            <p style={{...styles.statValue, color: '#fff'}}>{formatMoney(totalAbonnements + totalLeads + totalCommissions)}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {}),
          }}
        >
          Toutes ({factures.length})
        </button>
        <button
          onClick={() => setFilter('subscription')}
          style={{
            ...styles.filterButton,
            ...(filter === 'subscription' ? { ...styles.filterButtonActive, background: '#007bff' } : {}),
          }}
        >
          Abonnements
        </button>
        <button
          onClick={() => setFilter('lead')}
          style={{
            ...styles.filterButton,
            ...(filter === 'lead' ? { ...styles.filterButtonActive, background: '#FFA500' } : {}),
          }}
        >
          Leads
        </button>
        <button
          onClick={() => setFilter('commission')}
          style={{
            ...styles.filterButton,
            ...(filter === 'commission' ? { ...styles.filterButtonActive, background: '#28a745' } : {}),
          }}
        >
          Commissions
        </button>
      </div>

      {/* Table */}
      {filteredFactures.length === 0 ? (
        <div style={styles.empty}>Aucune facture pour le moment</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>N° Facture</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Montant</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredFactures.map((facture) => (
                <tr key={facture.id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.invoiceNumber}>{facture.id.slice(0, 8).toUpperCase()}</code>
                  </td>
                  <td style={styles.td}>{getTypeBadge(facture.type)}</td>
                  <td style={styles.td}>{facture.customerName || facture.providerName || '-'}</td>
                  <td style={styles.td}>{facture.description || '-'}</td>
                  <td style={styles.td}>
                    <strong style={{ color: '#28a745' }}>{formatMoney(facture.amount)}</strong>
                  </td>
                  <td style={styles.td}>{formatDate(facture.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    marginBottom: '30px',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  statIcon: {
    fontSize: '30px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  filterButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    background: '#e0e0e0',
    color: '#333',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: '#1a1a2e',
    color: '#fff',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '16px',
    background: '#f8f9fa',
    fontWeight: '600',
    fontSize: '13px',
    color: '#666',
    borderBottom: '1px solid #eee',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
  },
  invoiceNumber: {
    background: '#f0f0f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: '50px',
    background: '#fff',
    borderRadius: '12px',
    color: '#666',
  },
}

export default FacturesPage