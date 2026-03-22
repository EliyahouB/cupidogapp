import React, { useState } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../App'

function SupportPage() {
  const [searchType, setSearchType] = useState('email')
  const [searchValue, setSearchValue] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDogs, setUserDogs] = useState([])

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      alert('Entre une valeur à rechercher')
      return
    }

    setLoading(true)
    setResults([])
    setSelectedUser(null)

    try {
      const profilesRef = collection(db, 'profiles')
      let q

      if (searchType === 'email') {
        q = query(profilesRef, where('email', '==', searchValue.trim().toLowerCase()))
      } else if (searchType === 'name') {
        q = query(profilesRef, where('name', '==', searchValue.trim()))
      } else if (searchType === 'phone') {
        q = query(profilesRef, where('phone', '==', searchValue.trim()))
      }

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setResults(data)

      if (data.length === 0) {
        alert('Aucun utilisateur trouvé')
      }
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la recherche')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    
    // Charger les chiens de l'utilisateur
    try {
      const dogsRef = collection(db, 'users', user.uid, 'dogs')
      const snapshot = await getDocs(dogsRef)
      const dogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUserDogs(dogs)
    } catch (error) {
      console.error(error)
      setUserDogs([])
    }
  }

  const handleUpdateAbonnement = async (newAbonnement) => {
    if (!confirm(`Changer l'abonnement de ${selectedUser.name} en "${newAbonnement}" ?`)) return

    try {
      await updateDoc(doc(db, 'profiles', selectedUser.id), {
        abonnement: newAbonnement,
        abonnementUpdatedAt: new Date(),
        abonnementUpdatedBy: 'admin'
      })
      alert(`✅ Abonnement mis à jour : ${newAbonnement}`)
      setSelectedUser({ ...selectedUser, abonnement: newAbonnement })
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleSuspendUser = async () => {
    if (!confirm(`⚠️ Suspendre le compte de ${selectedUser.name} ?`)) return

    try {
      await updateDoc(doc(db, 'profiles', selectedUser.id), {
        status: 'suspended',
        suspendedAt: new Date()
      })
      alert(`🚫 Compte suspendu`)
      setSelectedUser({ ...selectedUser, status: 'suspended' })
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suspension')
    }
  }

  const handleReactivateUser = async () => {
    if (!confirm(`Réactiver le compte de ${selectedUser.name} ?`)) return

    try {
      await updateDoc(doc(db, 'profiles', selectedUser.id), {
        status: 'active',
        reactivatedAt: new Date()
      })
      alert(`✅ Compte réactivé`)
      setSelectedUser({ ...selectedUser, status: 'active' })
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la réactivation')
    }
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

  const getAbonnementBadge = (abo) => {
    const styles = {
      gratuit: { background: '#e0e0e0', color: '#333', label: 'Gratuit' },
      lite: { background: '#17a2b8', color: '#fff', label: 'Lite' },
      premium: { background: '#FFD700', color: '#333', label: 'Premium' },
      essentiel: { background: '#007bff', color: '#fff', label: 'Essentiel' },
    }
    const s = styles[abo] || styles.gratuit
    return (
      <span style={{
        padding: '4px 12px',
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

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Support</h1>
        <p style={styles.subtitle}>Rechercher et gérer les utilisateurs</p>
      </div>

      {/* Recherche */}
      <div style={styles.searchBox}>
        <div style={styles.searchRow}>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            style={styles.select}
          >
            <option value="email">Email</option>
            <option value="name">Nom</option>
            <option value="phone">Téléphone</option>
          </select>
          <input
            type="text"
            placeholder={`Rechercher par ${searchType}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.input}
          />
          <button onClick={handleSearch} style={styles.searchButton} disabled={loading}>
            {loading ? '⏳' : '🔍'} Rechercher
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Résultats */}
        <div style={styles.resultsPanel}>
          <h3 style={styles.panelTitle}>Résultats ({results.length})</h3>
          {results.length === 0 ? (
            <p style={styles.emptyText}>Aucun résultat</p>
          ) : (
            <div style={styles.resultsList}>
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  style={{
                    ...styles.resultItem,
                    ...(selectedUser?.id === user.id ? styles.resultItemActive : {}),
                  }}
                >
                  <div style={styles.resultAvatar}>
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt="" style={styles.avatar} />
                    ) : (
                      <span style={styles.avatarPlaceholder}>👤</span>
                    )}
                  </div>
                  <div>
                    <p style={styles.resultName}>{user.name || 'Sans nom'}</p>
                    <p style={styles.resultEmail}>{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Détails utilisateur */}
        <div style={styles.detailsPanel}>
          {!selectedUser ? (
            <div style={styles.emptyDetails}>
              <span style={{ fontSize: '50px' }}>👈</span>
              <p>Sélectionne un utilisateur pour voir ses détails</p>
            </div>
          ) : (
            <div>
              <div style={styles.userHeader}>
                {selectedUser.photoUrl ? (
                  <img src={selectedUser.photoUrl} alt="" style={styles.userAvatar} />
                ) : (
                  <span style={styles.userAvatarPlaceholder}>👤</span>
                )}
                <div>
                  <h2 style={styles.userName}>{selectedUser.name}</h2>
                  <p style={styles.userEmail}>{selectedUser.email}</p>
                </div>
              </div>

              <div style={styles.userInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>UID</span>
                  <code style={styles.infoValue}>{selectedUser.uid}</code>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Téléphone</span>
                  <span style={styles.infoValue}>{selectedUser.phone || '-'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Ville</span>
                  <span style={styles.infoValue}>{selectedUser.city || '-'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Inscrit le</span>
                  <span style={styles.infoValue}>{formatDate(selectedUser.createdAt)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Abonnement</span>
                  <span style={styles.infoValue}>{getAbonnementBadge(selectedUser.abonnement)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Statut</span>
                  <span style={styles.infoValue}>
                    {selectedUser.status === 'suspended' ? (
                      <span style={{ color: '#dc3545' }}>🚫 Suspendu</span>
                    ) : (
                      <span style={{ color: '#28a745' }}>✅ Actif</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Chiens */}
              <div style={styles.dogsSection}>
                <h3 style={styles.sectionTitle}>Chiens ({userDogs.length})</h3>
                {userDogs.length === 0 ? (
                  <p style={styles.emptyText}>Aucun chien</p>
                ) : (
                  <div style={styles.dogsList}>
                    {userDogs.map((dog) => (
                      <div key={dog.id} style={styles.dogCard}>
                        {dog.photoUrl ? (
                          <img src={dog.photoUrl} alt="" style={styles.dogPhoto} />
                        ) : (
                          <div style={styles.dogPhotoPlaceholder}>🐕</div>
                        )}
                        <p style={styles.dogName}>{dog.dogName}</p>
                        <p style={styles.dogBreed}>{dog.breed}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={styles.actionsSection}>
                <h3 style={styles.sectionTitle}>Actions</h3>
                
                <div style={styles.actionGroup}>
                  <p style={styles.actionLabel}>Changer l'abonnement :</p>
                  <div style={styles.actionButtons}>
                    <button onClick={() => handleUpdateAbonnement('gratuit')} style={styles.aboButton}>Gratuit</button>
                    <button onClick={() => handleUpdateAbonnement('lite')} style={{...styles.aboButton, background: '#17a2b8'}}>Lite</button>
                    <button onClick={() => handleUpdateAbonnement('essentiel')} style={{...styles.aboButton, background: '#007bff'}}>Essentiel</button>
                    <button onClick={() => handleUpdateAbonnement('premium')} style={{...styles.aboButton, background: '#FFD700', color: '#333'}}>Premium</button>
                  </div>
                </div>

                <div style={styles.actionGroup}>
                  <p style={styles.actionLabel}>Gestion du compte :</p>
                  <div style={styles.actionButtons}>
                    {selectedUser.status === 'suspended' ? (
                      <button onClick={handleReactivateUser} style={styles.reactivateButton}>
                        ✅ Réactiver le compte
                      </button>
                    ) : (
                      <button onClick={handleSuspendUser} style={styles.suspendButton}>
                        🚫 Suspendre le compte
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
  searchBox: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  searchRow: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    minWidth: '130px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  searchButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    color: '#fff',
    borderRadius: '8px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '20px',
  },
  resultsPanel: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '15px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: '1px solid #eee',
  },
  resultItemActive: {
    background: '#fff3e0',
    borderColor: '#FF8E53',
  },
  resultAvatar: {
    width: '40px',
    height: '40px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    background: '#eee',
    borderRadius: '50%',
    fontSize: '20px',
  },
  resultName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  resultEmail: {
    fontSize: '12px',
    color: '#666',
  },
  detailsPanel: {
    background: '#fff',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  emptyDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: '#999',
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
  },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
    marginBottom: '20px',
  },
  userAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userAvatarPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    background: '#eee',
    borderRadius: '50%',
    fontSize: '40px',
  },
  userName: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  userEmail: {
    fontSize: '14px',
    color: '#666',
  },
  userInfo: {
    marginBottom: '25px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  infoLabel: {
    color: '#666',
    fontSize: '14px',
  },
  infoValue: {
    fontWeight: '500',
    fontSize: '14px',
  },
  dogsSection: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '15px',
  },
  dogsList: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
  },
  dogCard: {
    textAlign: 'center',
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '10px',
    width: '100px',
  },
  dogPhoto: {
    width: '60px',
    height: '60px',
    borderRadius: '10px',
    objectFit: 'cover',
    marginBottom: '8px',
  },
  dogPhotoPlaceholder: {
    width: '60px',
    height: '60px',
    background: '#f5f5f5',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    margin: '0 auto 8px',
  },
  dogName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  dogBreed: {
    fontSize: '11px',
    color: '#666',
  },
  actionsSection: {
    borderTop: '1px solid #eee',
    paddingTop: '20px',
  },
  actionGroup: {
    marginBottom: '20px',
  },
  actionLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  aboButton: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    background: '#e0e0e0',
    color: '#fff',
    borderRadius: '6px',
  },
  suspendButton: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    background: '#dc3545',
    color: '#fff',
    borderRadius: '6px',
  },
  reactivateButton: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    background: '#28a745',
    color: '#fff',
    borderRadius: '6px',
  },
}

export default SupportPage