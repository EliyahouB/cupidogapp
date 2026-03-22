import React, { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../App'
import StatsPage from './StatsPage'
import ComptesProPage from './ComptesProPage'
import FacturesPage from './FacturesPage'
import VendeursPage from './VendeursPage'
import SupportPage from './SupportPage'
import AdminsPage from './AdminsPage'

function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('stats')

  const handleLogout = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await signOut(auth)
    }
  }

  const tabs = [
    { id: 'stats', label: 'Statistiques', icon: '📊' },
    { id: 'comptes-pro', label: 'Comptes PRO', icon: '✅' },
    { id: 'factures', label: 'Factures', icon: '🧾' },
    { id: 'vendeurs', label: 'Vendeurs', icon: '💰' },
    { id: 'support', label: 'Support', icon: '🔧' },
    { id: 'admins', label: 'Admins', icon: '👤' },
  ]

  const renderPage = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsPage />
      case 'comptes-pro':
        return <ComptesProPage />
      case 'factures':
        return <FacturesPage />
      case 'vendeurs':
        return <VendeursPage />
      case 'support':
        return <SupportPage />
      case 'admins':
        return <AdminsPage />
      default:
        return <StatsPage />
    }
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoSection}>
          <img src="/logo_cupidog.png" alt="CupiDog" style={styles.logoImg} />
          <p style={styles.subtitle}>Administration</p>
        </div>

        <nav style={styles.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navButton,
                ...(activeTab === tab.id ? styles.navButtonActive : {}),
              }}
            >
              <span style={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={styles.userSection}>
          <p style={styles.userEmail}>{user.email}</p>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {renderPage()}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '260px',
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
  },
  logoSection: {
    textAlign: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoImg: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
  },
  nav: {
    flex: 1,
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    fontSize: '15px',
    color: 'rgba(255,255,255,0.7)',
    background: 'transparent',
    borderRadius: '8px',
    textAlign: 'left',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    color: '#fff',
  },
  navIcon: {
    fontSize: '18px',
  },
  userSection: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '10px',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    background: '#f5f6fa',
  },
}

export default Dashboard