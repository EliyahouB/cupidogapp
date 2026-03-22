import React, { useState } from 'react'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../App'

const googleProvider = new GoogleAuthProvider()

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email ou mot de passe incorrect')
      } else if (err.code === 'auth/invalid-email') {
        setError('Email invalide')
      } else {
        setError('Erreur de connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error(err)
      setError('Erreur de connexion Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🐕</div>
        <h1 style={styles.title}>CupiDog Admin</h1>
        <p style={styles.subtitle}>Connexion au tableau de bord</p>

        {/* Bouton Google */}
        <button onClick={handleGoogleLogin} style={styles.googleButton} disabled={loading}>
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            style={{ width: '20px', marginRight: '10px' }}
          />
          Connexion avec Google
        </button>

        <div style={styles.separator}>
          <span style={styles.separatorText}>ou</span>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          
          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '60px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    margin: '25px 0',
  },
  separatorText: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    background: '#fff',
    position: 'relative',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    borderRadius: '8px',
    marginTop: '10px',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    margin: '0',
  },
}

export default Login