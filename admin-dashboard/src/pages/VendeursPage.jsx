import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore'
import { db } from '../App'

function VendeursPage() {
  const [vendeurs, setVendeurs] = useState([])
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, paid, all

  useEffect(() => {
    // Charger les vendeurs approuvés
    const qVendeurs = query(
      collection(db, 'professional_accounts'),
      where('activityType', '==', 'seller'),
      where('status', '==', 'approved')
    )
    
    const unsubVendeurs = onSnapshot(qVendeurs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setVendeurs(data)
    })

    // Charger les commandes marketplace
    const qVentes = query(
      collection(db, 'marketplace_orders'),
      orderBy('createdAt', 'desc')
    )

    const unsubVentes = onSnapshot(qVentes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setVentes(data)
      setLoading(false)
    })

    return () => {
      unsubVendeurs()
      unsubVentes()
    }
  }, [])

  const handleMarkAsPaid = async (vente) => {
    const montantReverser = Math.round(vente.totalAmount * 0.85)
    if (!confirm(`Confirmer le reversement de ${montantReverser}₪ à ${vente.sellerName} ?`)) return

    try {
      await updateDoc(doc(db, 'marketplace_orders', vente.id), {
        sellerPaid: true,
        sellerPaidAt: new Date(),
        sellerPaidAmount: montantReverser
      })
      alert(`✅ ${montantReverser}₪ marqué comme reversé à ${vente.sellerName}`)
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la mise à jour')
    }
  }

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

  const filteredVentes = ventes.filter(v => {
    if (filter === 'all') return true
    if (filter === 'pending') return !v.sellerPaid
    if (filter === 'paid') return v.sellerPaid
    return true
  })

  // Calculs
  const totalVentes = ventes.reduce((sum, v) => sum + (v.totalAmount || 0), 0)
  const commissionCupiDog = Math.round(totalVentes * 0.15)
  const totalAReverser = ventes
    .filter(v => !v.sellerPaid)
    .reduce((sum, v) => sum + Math.round((v.totalAmount || 0) * 0.85), 0)
  const totalReverse = ventes
    .filter(v => v.sellerPaid)
    .reduce((sum, v) => sum + (v.sellerPaidAmount || 0), 0)

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Vendeurs</h1>
        <p style={styles.subtitle}>Gestion des reversements (85% des ventes)</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛍️</div>
          <div>
            <p style={styles.statLabel}>Total des ventes</p>
            <p style={styles.statValue}>{formatMoney(totalVentes)}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💵</div>
          <div>
            <p style={styles.statLabel}>Commission CupiDog (15%)</p>
            <p style={styles.statValue}>{formatMoney(commissionCupiDog)}</p>
          </div>
        </div>
        <div style={{...styles.statCard, border: '2px solid #FFA500'}}>
          <div style={styles.statIcon}>⏳</div>
          <div>
            <p style={styles.statLabel}>À reverser</p>
            <p style={{...styles.statValue, color: '#FFA500'}}>{formatMoney(totalAReverser)}</p>
          </div>
        </div>
        <div style={{...styles.statCard, border: '2px solid #28a745'}}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <p style={styles.statLabel}>Déjà reversé</p>
            <p style={{...styles.statValue, color: '#28a745'}}>{formatMoney(totalReverse)}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('pending')}
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? { ...styles.filterButtonActive, background: '#FFA500' } : {}),
          }}
        >
          À reverser ({ventes.filter(v => !v.sellerPaid).length})
        </button>
        <button
          onClick={() => setFilter('paid')}
          style={{
            ...styles.filterButton,
            ...(filter === 'paid' ? { ...styles.filterButtonActive, background: '#28a745' } : {}),
          }}
        >
          Reversés ({ventes.filter(v => v.sellerPaid).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {}),
          }}
        >
          Tous ({ventes.length})
        </button>
      </div>

      {/* Table */}
      {filteredVentes.length === 0 ? (
        <div style={styles.empty}>Aucune vente pour le moment</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Commande</th>
                <th style={styles.th}>Vendeur</th>
                <th style={styles.th}>Produit</th>
                <th style={styles.th}>Vente totale</th>
                <th style={styles.th}>Commission (15%)</th>
                <th style={styles.th}>À reverser (85%)</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map((vente) => {
                const commission = Math.round((vente.totalAmount || 0) * 0.15)
                const toReverse = Math.round((vente.totalAmount || 0) * 0.85)
                
                return (
                  <tr key={vente.id} style={styles.tr}>
                    <td style={styles.td}>
                      <code style={styles.orderNumber}>{vente.id.slice(0, 8).toUpperCase()}</code>
                    </td>
                    <td style={styles.td}>
                      <strong>{vente.sellerName || '-'}</strong>
                      <br />
                      <span style={styles.smallText}>{vente.sellerEmail || ''}</span>
                    </td>
                    <td style={styles.td}>{vente.productName || '-'}</td>
                    <td style={styles.td}>{formatMoney(vente.totalAmount)}</td>
                    <td style={styles.td}>
                      <span style={{ color: '#28a745' }}>{formatMoney(commission)}</span>
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: '#FFA500' }}>{formatMoney(toReverse)}</strong>
                    </td>
                    <td style={styles.td}>{formatDate(vente.createdAt)}</td>
                    <td style={styles.td}>
                      {vente.sellerPaid ? (
                        <span style={styles.badgePaid}>✅ Reversé</span>
                      ) : (
                        <span style={styles.badgePending}>⏳ En attente</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {!vente.sellerPaid && (
                        <button
                          onClick={() => handleMarkAsPaid(vente)}
                          style={styles.payButton}
                        >
                          💸 Marquer payé
                        </button>
                      )}
                      {vente.sellerPaid && (
                        <span style={styles.paidDate}>
                          {formatDate(vente.sellerPaidAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Liste des vendeurs */}
      <div style={styles.vendeurSection}>
        <h2 style={styles.sectionTitle}>Vendeurs enregistrés ({vendeurs.length})</h2>
        <div style={styles.vendeurGrid}>
          {vendeurs.map((vendeur) => (
            <div key={vendeur.id} style={styles.vendeurCard}>
              <h3 style={styles.vendeurName}>{vendeur.companyName}</h3>
              <p style={styles.vendeurInfo}>📧 {vendeur.email}</p>
              <p style={styles.vendeurInfo}>📱 {vendeur.phone || '-'}</p>
              <p style={styles.vendeurInfo}>🏦 {vendeur.iban || vendeur.bitPhone || 'Pas d\'IBAN/Bit'}</p>
            </div>
          ))}
        </div>
      </div>
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
    color: '#fff',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: '40px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f8f9fa',
    fontWeight: '600',
    fontSize: '12px',
    color: '#666',
    borderBottom: '1px solid #eee',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '14px',
    fontSize: '13px',
  },
  orderNumber: {
    background: '#f0f0f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  smallText: {
    fontSize: '11px',
    color: '#999',
  },
  badgePaid: {
    background: '#d4edda',
    color: '#155724',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  badgePending: {
    background: '#fff3cd',
    color: '#856404',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  payButton: {
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#28a745',
    color: '#fff',
    borderRadius: '6px',
  },
  paidDate: {
    fontSize: '11px',
    color: '#666',
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
    marginBottom: '40px',
  },
  vendeurSection: {
    marginTop: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '20px',
  },
  vendeurGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  vendeurCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  vendeurName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '10px',
  },
  vendeurInfo: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px',
  },
}

export default VendeursPage