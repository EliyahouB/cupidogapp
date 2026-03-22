import React, { useState, useEffect } from 'react'
import { collection, query, onSnapshot, collectionGroup } from 'firebase/firestore'
import { db } from '../App'

function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    // Utilisateurs
    totalUsers: 0,
    usersGratuit: 0,
    usersLite: 0,
    usersPremium: 0,
    usersByPurpose: {},
    
    // Chiens
    totalDogs: 0,
    dogsByPurpose: {},
    
    // PRO
    totalPro: 0,
    proPrestataires: 0,
    proVendeurs: 0,
    proPending: 0,
    
    // Leads
    totalLeads: 0,
    leadsPending: 0,
    leadsAccepted: 0,
    
    // Marketplace
    totalOrders: 0,
    totalOrdersAmount: 0,
    commissionTotal: 0,
    
    // Factures
    totalInvoices: 0,
    revenueAbonnements: 0,
    revenueLeads: 0,
    revenueCommissions: 0,
  })

  useEffect(() => {
    const unsubscribes = []

    // 1. PROFILES (utilisateurs + abonnements)
    const qProfiles = query(collection(db, 'profiles'))
    unsubscribes.push(onSnapshot(qProfiles, (snapshot) => {
      const profiles = snapshot.docs.map(doc => doc.data())
      
      const usersGratuit = profiles.filter(p => !p.abonnement || p.abonnement === 'gratuit' || p.abonnement === 'free').length
      const usersLite = profiles.filter(p => p.abonnement === 'lite' || p.abonnement === 'essential').length
      const usersPremium = profiles.filter(p => p.abonnement === 'premium').length
      
      // Par purpose
      const purposeCounts = {}
      profiles.forEach(p => {
        const purpose = p.purpose || 'Non défini'
        purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1
      })

      setStats(prev => ({
        ...prev,
        totalUsers: profiles.length,
        usersGratuit,
        usersLite,
        usersPremium,
        usersByPurpose: purposeCounts,
      }))
    }))

    // 2. DOGS (sous-collection via collectionGroup)
    const qDogs = query(collectionGroup(db, 'dogs'))
    unsubscribes.push(onSnapshot(qDogs, (snapshot) => {
      const dogs = snapshot.docs.map(doc => doc.data())
      
      const dogsByPurpose = {}
      dogs.forEach(d => {
        const purpose = d.purpose || d.type || 'Non défini'
        dogsByPurpose[purpose] = (dogsByPurpose[purpose] || 0) + 1
      })

      setStats(prev => ({
        ...prev,
        totalDogs: dogs.length,
        dogsByPurpose,
      }))
    }))

    // 3. PROFESSIONAL ACCOUNTS
    const qPro = query(collection(db, 'professional_accounts'))
    unsubscribes.push(onSnapshot(qPro, (snapshot) => {
      const pros = snapshot.docs.map(doc => doc.data())
      
      const proPrestataires = pros.filter(p => p.activityType === 'provider' && p.status === 'approved').length
      const proVendeurs = pros.filter(p => p.activityType === 'seller' && p.status === 'approved').length
      const proPending = pros.filter(p => p.status === 'pending').length

      setStats(prev => ({
        ...prev,
        totalPro: pros.filter(p => p.status === 'approved').length,
        proPrestataires,
        proVendeurs,
        proPending,
      }))
    }))

    // 4. LEADS
    const qLeads = query(collection(db, 'marketplace_leads'))
    unsubscribes.push(onSnapshot(qLeads, (snapshot) => {
      const leads = snapshot.docs.map(doc => doc.data())
      
      const leadsPending = leads.filter(l => l.status === 'pending' || !l.status).length
      const leadsAccepted = leads.filter(l => l.status === 'accepted' || l.status === 'completed').length

      setStats(prev => ({
        ...prev,
        totalLeads: leads.length,
        leadsPending,
        leadsAccepted,
      }))
    }))

    // 5. MARKETPLACE ORDERS
    const qOrders = query(collection(db, 'marketplace_orders'))
    unsubscribes.push(onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data())
      
      const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      const commissionTotal = Math.round(totalOrdersAmount * 0.15)

      setStats(prev => ({
        ...prev,
        totalOrders: orders.length,
        totalOrdersAmount,
        commissionTotal,
      }))
    }))

    // 6. INVOICES
    const qInvoices = query(collection(db, 'invoices'))
    unsubscribes.push(onSnapshot(qInvoices, (snapshot) => {
      const invoices = snapshot.docs.map(doc => doc.data())
      
      const revenueAbonnements = invoices
        .filter(i => i.type === 'subscription')
        .reduce((sum, i) => sum + (i.amount || 0), 0)
      
      const revenueLeads = invoices
        .filter(i => i.type === 'lead')
        .reduce((sum, i) => sum + (i.amount || 0), 0)
      
      const revenueCommissions = invoices
        .filter(i => i.type === 'commission' || i.type === 'commission_invoice')
        .reduce((sum, i) => sum + (i.amount || 0), 0)

      setStats(prev => ({
        ...prev,
        totalInvoices: invoices.length,
        revenueAbonnements,
        revenueLeads,
        revenueCommissions,
      }))
      
      setLoading(false)
    }))

    return () => unsubscribes.forEach(unsub => unsub())
  }, [])

  const formatMoney = (amount) => `${amount || 0}₪`

  const totalRevenue = stats.revenueAbonnements + stats.revenueLeads + stats.revenueCommissions

  if (loading) {
    return <div style={styles.loading}>Chargement des statistiques...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Statistiques</h1>
        <p style={styles.subtitle}>Vue d'ensemble de CupiDog</p>
      </div>

      {/* SECTION 1: VUE D'ENSEMBLE */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🎯 Vue d'ensemble</h2>
        <div style={styles.grid4}>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <p style={styles.cardLabelWhite}>Total Utilisateurs</p>
            <p style={styles.cardValueWhite}>{stats.totalUsers}</p>
          </div>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
            <p style={styles.cardLabelWhite}>Total Chiens</p>
            <p style={styles.cardValueWhite}>{stats.totalDogs}</p>
          </div>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
            <p style={styles.cardLabelWhite}>Comptes PRO</p>
            <p style={styles.cardValueWhite}>{stats.totalPro}</p>
          </div>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'}}>
            <p style={styles.cardLabelWhite}>Revenus Total</p>
            <p style={styles.cardValueWhite}>{formatMoney(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: UTILISATEURS */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>👥 Utilisateurs</h2>
        <div style={styles.grid4}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Gratuits</p>
            <p style={styles.cardValue}>{stats.usersGratuit}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Lite / Essentiel</p>
            <p style={{...styles.cardValue, color: '#007bff'}}>{stats.usersLite}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Premium</p>
            <p style={{...styles.cardValue, color: '#FFD700'}}>{stats.usersPremium}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>En attente PRO</p>
            <p style={{...styles.cardValue, color: '#FFA500'}}>{stats.proPending}</p>
          </div>
        </div>
        
        {/* Par purpose */}
        <div style={styles.subSection}>
          <h3 style={styles.subTitle}>Par objectif</h3>
          <div style={styles.grid3}>
            {Object.entries(stats.usersByPurpose).map(([purpose, count]) => (
              <div key={purpose} style={styles.miniCard}>
                <span style={styles.miniLabel}>{purpose}</span>
                <span style={styles.miniValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: CHIENS */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🐕 Chiens / Annonces</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Total annonces</p>
            <p style={styles.cardValue}>{stats.totalDogs}</p>
          </div>
          {Object.entries(stats.dogsByPurpose).map(([purpose, count]) => (
            <div key={purpose} style={styles.card}>
              <p style={styles.cardLabel}>{purpose}</p>
              <p style={styles.cardValue}>{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: PRO */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⭐ Comptes PRO</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Prestataires</p>
            <p style={{...styles.cardValue, color: '#007bff'}}>{stats.proPrestataires}</p>
            <p style={styles.cardDetail}>Véto, toiletteur, éducateur...</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Vendeurs Marketplace</p>
            <p style={{...styles.cardValue, color: '#28a745'}}>{stats.proVendeurs}</p>
            <p style={styles.cardDetail}>Croquettes, accessoires...</p>
          </div>
          <div style={{...styles.card, border: '2px solid #FFA500'}}>
            <p style={styles.cardLabel}>En attente</p>
            <p style={{...styles.cardValue, color: '#FFA500'}}>{stats.proPending}</p>
            <p style={styles.cardDetail}>À valider</p>
          </div>
        </div>
      </div>

      {/* SECTION 5: LEADS */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📞 Leads Prestataires</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Total leads</p>
            <p style={styles.cardValue}>{stats.totalLeads}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>En attente</p>
            <p style={{...styles.cardValue, color: '#FFA500'}}>{stats.leadsPending}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Acceptés</p>
            <p style={{...styles.cardValue, color: '#28a745'}}>{stats.leadsAccepted}</p>
          </div>
        </div>
      </div>

      {/* SECTION 6: MARKETPLACE */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🛒 Marketplace</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Commandes</p>
            <p style={styles.cardValue}>{stats.totalOrders}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Ventes totales</p>
            <p style={styles.cardValue}>{formatMoney(stats.totalOrdersAmount)}</p>
          </div>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
            <p style={styles.cardLabelWhite}>Commission CupiDog (15%)</p>
            <p style={styles.cardValueWhite}>{formatMoney(stats.commissionTotal)}</p>
          </div>
        </div>
      </div>

      {/* SECTION 7: REVENUS */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💰 Revenus & Bénéfices</h2>
        <div style={styles.grid4}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Abonnements</p>
            <p style={{...styles.cardValue, color: '#007bff'}}>{formatMoney(stats.revenueAbonnements)}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Leads (15₪/lead)</p>
            <p style={{...styles.cardValue, color: '#FFA500'}}>{formatMoney(stats.revenueLeads)}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Commissions (15%)</p>
            <p style={{...styles.cardValue, color: '#28a745'}}>{formatMoney(stats.revenueCommissions)}</p>
          </div>
          <div style={{...styles.card, background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'}}>
            <p style={styles.cardLabelWhite}>💎 BÉNÉFICE TOTAL</p>
            <p style={{...styles.cardValueWhite, fontSize: '32px'}}>{formatMoney(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* SECTION BOOSTS (placeholder) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🚀 Boosts</h2>
        <div style={{...styles.card, textAlign: 'center', padding: '40px'}}>
          <p style={{fontSize: '40px', marginBottom: '10px'}}>🚧</p>
          <p style={{color: '#666'}}>Fonctionnalité à implémenter</p>
          <p style={{color: '#999', fontSize: '13px'}}>Les statistiques des boosts apparaîtront ici</p>
        </div>
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
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '2px solid #eee',
  },
  subSection: {
    marginTop: '20px',
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '10px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  cardLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
  },
  cardLabelWhite: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '8px',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cardValueWhite: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
  },
  cardDetail: {
    fontSize: '11px',
    color: '#999',
    marginTop: '5px',
  },
  miniCard: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: '13px',
    color: '#666',
  },
  miniValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
}

export default StatsPage