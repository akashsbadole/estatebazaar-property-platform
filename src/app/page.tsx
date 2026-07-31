'use client'

import { useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AuthModal } from '@/components/auth-modal'
import { HomeView } from '@/components/views/home-view'
import { ListingsView } from '@/components/views/listings-view'
import { DetailView } from '@/components/views/detail-view'
import { PostView } from '@/components/views/post-view'
import { ChatView } from '@/components/views/chat-view'
import { ProfileView } from '@/components/views/profile-view'
import { MyListingsView } from '@/components/views/my-listings-view'
import { AdminView } from '@/components/views/admin-view'
import { PricingView } from '@/components/views/pricing-view'
import { CompareView } from '@/components/views/compare-view'
import { CompareTray } from '@/components/compare-tray'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { useApp } from '@/lib/store'

export default function Home() {
  const { view, user, fetchUser, authLoading, navigate } = useApp()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Guard: if user navigates to a protected view without auth, redirect to home
  useEffect(() => {
    if (authLoading) return
    if (!user && (view.name === 'post' || view.name === 'edit' || view.name === 'chats' || view.name === 'profile' || view.name === 'my-listings' || view.name === 'favorites' || view.name === 'admin')) {
      navigate({ name: 'home' })
    }
    if (user && view.name === 'admin' && user.role !== 'ADMIN') {
      navigate({ name: 'home' })
    }
  }, [user, view, authLoading, navigate])

  const isChatView = view.name === 'chats'
  // Chat view should fill the screen without footer
  if (isChatView) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">
          <ChatView initialChatId={(view as any).chatId} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {view.name === 'home' && <HomeView />}
        {view.name === 'listings' && <ListingsView initialQuery={view.query} />}
        {view.name === 'detail' && <DetailView propertyId={view.propertyId} />}
        {view.name === 'post' && <PostView />}
        {view.name === 'edit' && <PostView editPropertyId={view.propertyId} />}
        {view.name === 'profile' && <ProfileView />}
        {view.name === 'my-listings' && (
          <MyListingsView
            endpoint="/api/properties/my"
            title="My Listings"
            emptyTitle="No listings yet"
            emptyDescription="Post your first property to start receiving enquiries from buyers."
            emptyIcon="listings"
          />
        )}
        {view.name === 'favorites' && (
          <MyListingsView
            endpoint="/api/favorites"
            title="My Favorites"
            emptyTitle="No favorites yet"
            emptyDescription="Tap the heart icon on any property to save it for later."
            emptyIcon="favorites"
          />
        )}
        {view.name === 'admin' && <AdminView />}
        {view.name === 'pricing' && <PricingView />}
        {view.name === 'compare' && <CompareView initialIds={view.ids} />}
      </main>
      <Footer />
      <AuthModal />
      <CompareTray />
      <PWAInstallPrompt />
    </div>
  )
}
