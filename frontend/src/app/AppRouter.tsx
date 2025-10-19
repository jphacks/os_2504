import type { ReactElement } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import HomePage from './pages/home/HomePage'
import GroupVotePage from './pages/group/GroupVotePage'
import RestaurantDetailPage from './pages/restaurant/RestaurantDetailPage'

const AppRouter = (): ReactElement => (
  <Router>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/group/:groupId" element={<GroupVotePage />} />
      <Route path="/restaurant/:placeId" element={<RestaurantDetailPage />} />
    </Routes>
  </Router>
)

export default AppRouter
