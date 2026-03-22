import React, { useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Configuration Firebase (même que ton app)
const firebaseConfig = {
  apiKey: "AIzaSyCcoAzHUihZCk8XWWrf2tJIxZZ7jERxtzA",
  authDomain: "cupidog-3d60d.firebaseapp.com",
  projectId: "cupidog-3d60d",
  storageBucket: "cupidog-3d60d.appspot.com",
  messagingSenderId: "1046022722691",
  appId: "1:1046022722691:web:xxxxxxx"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Vérifier si c'est un admin
        const adminEmails = ['elie.bialik@gmail.com'] // Tu pourras ajouter d'autres admins plus tard
        if (adminEmails.includes(currentUser.email)) {
          setUser(currentUser)
          setIsAdmin(true)
        } else {
          setUser(null)
          setIsAdmin(false)
          await signOut(auth)
          alert('Accès refusé. Vous n\'êtes pas administrateur.')
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Login />
  }

  return <Dashboard user={user} />
}

export default App