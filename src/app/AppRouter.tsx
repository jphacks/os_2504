import type { ReactElement } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import HomePage from './pages/home/HomePage'
import RoomVotePage from './pages/room/RoomVotePage'

const AppRouter = (): ReactElement => (
  <Router>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/r/:roomCode" element={<RoomVotePage />} />
    </Routes>
  </Router>
)

export default AppRouter
