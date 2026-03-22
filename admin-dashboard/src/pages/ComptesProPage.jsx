import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../App'

function ComptesProPage() {
  const [comptes, setComptes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, approved, rejected, all

  useEffect(() => {
    const q = query(collection(db, 'professional_accounts'), orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setComptes(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleApprove = async (compte) => {
    if (!confirm(`Approuver ${compte.companyName} ?`)) return
    
    try {
      await updateDoc(doc(db, 'professional_accounts', compte.id), {
        status: 'approved',
        approvedAt: new Date()
      })
      alert(`✅ ${compte.companyName} approuvé ! Email et WhatsApp envoyés.`)
    } catch (error) {
      console.error(error)
      alert('Erreur lors de l\'approbation')
    }
  }

  const handleReject = async (compte) => {
    const reason = prompt(`Raison du refus pour ${compte.companyName} :`)
    if (!reason) return
    
    try {
      await updateDoc(doc(db, 'professional_accounts', compte.id), {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason
      })
      alert(`❌ ${compte.companyName} refusé.`)
    } catch (error) {
      console.error(error)
      alert('Erreur lors du refus')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#FFA500', color: '#fff', label: 'En attente' },
      approved: { background: '#28a745', color: '#fff', label: 'Approuvé' },
      rejected: { background: '#dc3545', color: '#fff', label: 'Refusé' },
    }
    const s = styles[status] || styles.pending
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: s.background,
        color: s.color,
      }}>
        {s.label}
      </span>
    )
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredComptes = filter === 'all' 
    ? comptes 
    : comptes.filter(c => c.status === filter)

  const counts = {
    pending: comptes.filter(c => c.status === 'pending').length,
    approved: comptes.filter(c => c.status === 'approved').length,
    rejected: comptes.filter(c => c.status === 'rejected').length,
  }

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Comptes PRO</h1>
        <p style={styles.subtitle}>Validez les nouveaux comptes professionnels</p>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('pending')}
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? styles.filterButtonActive : {}),
            ...(filter === 'pending' ? { background: '#FFA500' } : {}),
          }}
        >
          En attente ({counts.pending})
        </button>
        <button
          onClick={() => setFilter('approved')}
          style={{
            ...styles.filterButton,
            ...(filter === 'approved' ? styles.filterButtonActive : {}),
            ...(filter === 'approved' ? { background: '#28a745' } : {}),
          }}
        >
          Approuvés ({counts.approved})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          style={{
            ...styles.filterButton,
            ...(filter === 'rejected' ? styles.filterButtonActive : {}),
            ...(filter === 'rejected' ? { background: '#dc3545' } : {}),
          }}
        >
          Refusés ({counts.rejected})
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {}),
          }}
        >
          Tous ({comptes.length})
        </button>
      </div>

      {/* Table */}
      {filteredComptes.length === 0 ? (
        <div style={styles.empty}>Aucun compte à afficher</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Entreprise</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Ville</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComptes.map((compte) => (
                <tr key={compte.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{compte.companyName || '-'}</strong>
                  </td>
                  <td style={styles.td}>
                    {compte.activityType === 'service_provider' ? '🔧 Prestataire' : '🛍️ Vendeur'}
                  </td>
                  <td style={styles.td}>{compte.email || '-'}</td>
                  <td style={styles.td}>{compte.address?.city || '-'}</td>
                  <td style={styles.td}>{formatDate(compte.createdAt)}</td>
                  <td style={styles.td}>{getStatusBadge(compte.status)}</td>
                  <td style={styles.td}>
                    {compte.status === 'pending' && (
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleApprove(compte)}
                          style={styles.approveButton}
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => handleReject(compte)}
                          style={styles.rejectButton}
                        >
                          ❌ Refuser
                        </button>
                      </div>
                    )}
                  </td>
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
  actions: {
    display: 'flex',
    gap: '8px',
  },
  approveButton: {
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '500',
    background: '#28a745',
    color: '#fff',
    borderRadius: '6px',
  },
  rejectButton: {
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '500',
    background: '#dc3545',
    color: '#fff',
    borderRadius: '6px',
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

export default ComptesProPage