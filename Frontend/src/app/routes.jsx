import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import Home from '../pages/Home'
import SearchResults from '../pages/SearchResults'
import AdminPanel from '../pages/AdminPanel'
import Login from '../pages/Login'
import Register from '../pages/Register'
import BookVehicle from '../pages/BookVehicle'
import MyBookings from '../pages/MyBookings'
import Profile from '../pages/Profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'search', element: <SearchResults /> },
      { path: 'admin', element: <AdminPanel /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'book/:id', element: <BookVehicle /> },
      { path: 'my-bookings', element: <MyBookings /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
])
