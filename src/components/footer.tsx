'use client'

import { Building2, Mail, Phone, Github, Twitter, Linkedin } from 'lucide-react'
import { useApp } from '@/lib/store'

export function Footer() {
  const { navigate } = useApp()
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">
                Estate<span className="text-primary">Bazaar</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              India&apos;s peer-to-peer property marketplace. Post free listings, chat directly with
              sellers, and find your dream home.
            </p>
            <div className="flex gap-2 mt-4">
              <a
                href="#"
                className="h-8 w-8 rounded-full bg-background border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="h-8 w-8 rounded-full bg-background border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="h-8 w-8 rounded-full bg-background border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => navigate({ name: 'listings' })} className="hover:text-primary">
                  Buy Property
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'listings', query: { type: 'FLAT' } })} className="hover:text-primary">
                  Apartments
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'listings', query: { type: 'VILLA' } })} className="hover:text-primary">
                  Villas
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'listings', query: { type: 'PLOT' } })} className="hover:text-primary">
                  Plots
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'post' })} className="hover:text-primary">
                  Post Property
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'pricing' })} className="hover:text-primary">
                  Pricing &amp; Plans
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => navigate({ name: 'profile' })} className="hover:text-primary">
                  My Profile
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'my-listings' })} className="hover:text-primary">
                  My Listings
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'favorites' })} className="hover:text-primary">
                  Favorites
                </button>
              </li>
              <li>
                <button onClick={() => navigate({ name: 'chats' })} className="hover:text-primary">
                  My Chats
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> support@estatebazaar.in
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> +91 99999 99999
              </li>
              <li className="text-xs mt-3">
                Mon–Sat, 9 AM – 7 PM IST
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/60 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EstateBazaar. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary">Privacy Policy</a>
            <a href="#" className="hover:text-primary">Terms of Use</a>
            <a href="#" className="hover:text-primary">Safety Tips</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
