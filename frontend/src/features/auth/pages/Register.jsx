import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import useAuth from '../hooks/useAuth'
import '../../auth.form.scss'

export default function Register() {
  const { loading, handleRegister } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      await handleRegister({ username, email, password })
      navigate('/')
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Registration failed. Please try again.')
    }
  }

  if (loading) {
    return <main><h1>...Loading</h1></main>
  }

  return (
    <main>
      <div className="form-container">
        <p>PrepPilot AI</p>
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              id="email"
              name="email"
              placeholder="Enter email address"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              name="password"
              id="password"
              placeholder="Enter password"
            />
          </div>
          {authError && <p className="form-error" role="alert">{authError}</p>}
          <button className="button primary-button" type="submit">Register</button>
        </form>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </main>
  )
}
