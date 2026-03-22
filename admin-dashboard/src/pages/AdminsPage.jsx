import React, { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../App'

function AdminsPage() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'admins'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Si la collection est vide, ajouter l'admin principal
      if (data.length === 0) {
        addDoc(collection(db, 'admins'), {
          email: 'elie.bialik@gmail.com',
          name: 'Eliyahou',
          role: 'super_admin',
          createdAt: new Date()
        })
      }
      
      setAdmins(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAddAdmin = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      alert('Remplis le nom et l\'email')
      return
    }

    if (!newEmail.includes('@')) {
      alert('Email invalide')
      return
    }

    // Vérifier si l'email existe déjà
    if (admins.some(a => a.email.toLowerCase() === newEmail.toLowerCase())) {
      alert('Cet email est déjà admin')
      return
    }

    try {
      await addDoc(collection(db, 'admins'), {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim(),
        role: 'admin',
        createdAt: new Date(),
        addedBy: auth.currentUser.email
      })
      alert(`✅ ${newName} ajouté comme admin`)
      setNewEmail('')
      setNewName('')
    } catch (error) {
      console.error(error)
      alert('Erreur lors de l\'ajout')
    }
  }

  const handleDeleteAdmin = async (admin) => {
    if (admin.role === 'super_admin') {
      alert('❌ Impossible de supprimer le super admin')
      return
    }

    if (!confirm(`Supprimer ${admin.name} (${admin.email}) des admins ?`)) return

    try {
      await deleteDoc(doc(db, 'admins', admin.id))
      alert(`✅ ${admin.name} supprimé des admins`)
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleUpdateEmail = async (admin) => {
    const newEmailInput = prompt(`Nouveau email pour ${admin.name} :`, admin.email)
    if (!newEmailInput || newEmailInput === admin.email) return

    if (!newEmailInput.includes('@')) {
      alert('Email invalide')
      return
    }

    try {
      await updateDoc(doc(db, 'admins', admin.id), {
        email: newEmailInput.trim().toLowerCase(),
        updatedAt: new Date()
      })
      alert(`✅ Email mis à jour`)
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

  const getRoleBadge = (role) => {
    if (role === 'super_admin') {
      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: '#fff',
        }}>
          👑 Super Admin
        </span>
      )
    }
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: '#007bff',
        color: '#fff',
      }}>
        Admin
      </span>
    )
  }

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Administrateurs</h1>
        <p style={styles.subtitle}>Gérer les accès au dashboard</p>
      </div>

      {/* Ajouter un admin */}
      <div style={styles.addBox}>
        <h3 style={styles.addTitle}>➕ Ajouter un administrateur</h3>
        <div style={styles.addRow}>
          <input
            type="text"
            placeholder="Nom"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{...styles.input, flex: 2}}
          />
          <button onClick={handleAddAdmin} style={styles.addButton}>
            Ajouter
          </button>
        </div>
        <p style={styles.addNote}>
          ⚠️ L'admin doit avoir un compte Firebase (s'être déjà connecté à l'app CupiDog) pour pouvoir accéder au dashboard.
        </p>
      </div>

      {/* Liste des admins */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nom</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Rôle</th>
              <th style={styles.th}>Ajouté le</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={styles.tr}>
                <td style={styles.td}>
                  <strong>{admin.name}</strong>
                </td>
                <td style={styles.td}>{admin.email}</td>
                <td style={styles.td}>{getRoleBadge(admin.role)}</td>
                <td style={styles.td}>{formatDate(admin.createdAt)}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => handleUpdateEmail(admin)}
                      style={styles.editButton}
                    >
                      ✏️ Modifier
                    </button>
                    {admin.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        style={styles.deleteButton}
                      >
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info sécurité */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>🔐 Sécurité</h3>
        <ul style={styles.infoList}>
          <li>Seuls les emails listés ici peuvent accéder au dashboard</li>
          <li>Le Super Admin ne peut pas être supprimé</li>
          <li>Chaque admin peut voir et gérer les comptes PRO, factures, vendeurs et support</li>
          <li>Pour changer ton email principal, modifie-le ici ET dans Firebase Auth</li>
        </ul>
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
  addBox: {
    background: '#fff',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  addTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '15px',
  },
  addRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  addButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    background: '#28a745',
    color: '#fff',
    borderRadius: '8px',
  },
  addNote: {
    fontSize: '12px',
    color: '#666',
    marginTop: '10px',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: '20px',
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
  editButton: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    background: '#007bff',
    color: '#fff',
    borderRadius: '6px',
  },
  deleteButton: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    background: '#dc3545',
    color: '#fff',
    borderRadius: '6px',
  },
  infoBox: {
    background: '#e8f4fd',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #b8daff',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#004085',
    marginBottom: '10px',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#004085',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#666',
  },
}

export default AdminsPage