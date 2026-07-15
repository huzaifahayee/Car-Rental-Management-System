// Frontend/src/App.jsx (temporary — will be replaced once routing is wired)
import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  )
}