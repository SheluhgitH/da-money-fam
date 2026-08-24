'use client'

import { useEffect, useState } from 'react'
import {
  asAboutSettings,
  asHeroSettings,
  asHiddenStreamIds,
  asPricingSettings,
  packsFromSettings,
  type AdStudioPricingSettings,
  type HomepageAboutSettings,
  type HomepageHeroSettings,
} from '@/lib/site-settings'
import {
  asHomepageSections,
  HOMEPAGE_SECTION_META,
  type HomepageSectionConfig,
} from '@/lib/homepage-sections'
import { IMAGE_MODELS, IMAGE_TIERS, type ImageTier, asImageModelSettings, TIER_FLOOR, type ImageModelOverrides } from '@/lib/image-models'
import { COIN_PACKAGES, type CoinPackage } from '@/lib/coin-packages'

export default function SiteSettingsPanel() {
  const [hero, setHero] = useState<HomepageHeroSettings>(asHeroSettings(null))
  const [about, setAbout] = useState<HomepageAboutSettings>(asAboutSettings(null))
  const [pricing, setPricing] = useState<AdStudioPricingSettings>(asPricingSettings(null))
  const [imageModels, setImageModels] = useState<ImageModelOverrides>({
    draft: { baseCoins: TIER_FLOOR.draft },
    fast: { baseCoins: TIER_FLOOR.fast },
    edit: { baseCoins: TIER_FLOOR.edit },
    smart: { baseCoins: TIER_FLOOR.smart },
  })
  const [hiddenIds, setHiddenIds] = useState('')
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [sections, setSections] = useState<HomepageSectionConfig[]>(asHomepageSections(null))
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {}
        setHero(asHeroSettings(s['homepage.hero']))
        setAbout(asAboutSettings(s['homepage.about']))
        setPricing(asPricingSettings(s['ad_studio.pricing']))
        setImageModels({
          draft: { baseCoins: TIER_FLOOR.draft },
          fast: { baseCoins: TIER_FLOOR.fast },
          edit: { baseCoins: TIER_FLOOR.edit },
          smart: { baseCoins: TIER_FLOOR.smart },
          ...asImageModelSettings(s['ad_studio.image_models']),
        })
        setHiddenIds(asHiddenStreamIds(s['streams.hidden_ids']).join('\n'))
        setPacks(packsFromSettings(s['ad_studio.packs']))
        setSections(asHomepageSections(s['homepage.sections']))
      })
      .catch(() => setMessage('Failed to load settings'))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const packsPayload = Object.fromEntries(
      packs.map((p) => [p.id, { amount: p.amount, price: p.price, label: p.label }])
    )

    const res = await fetch('/api/admin/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          'homepage.hero': hero,
          'homepage.about': about,
          'ad_studio.pricing': pricing,
          'ad_studio.image_models': Object.fromEntries(
            IMAGE_TIERS.map((t) => [
              t,
              {
                baseCoins: Math.max(
                  TIER_FLOOR[t],
                  Number(imageModels[t]?.baseCoins) || TIER_FLOOR[t]
                ),
              },
            ])
          ),
          'ad_studio.packs': packsPayload,
          'homepage.sections': sections,
          'streams.hidden_ids': hiddenIds
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    })
    const data = await res.json()
    setSaving(false)
    setMessage(res.ok ? 'Saved. Live site updates within about a minute.' : data.error || 'Save failed')
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {message && <p className="text-sm text-gold">{message}</p>}

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Homepage hero</h3>
        {(
          [
            ['kicker', 'Kicker'],
            ['headline', 'Headline'],
            ['tagline', 'Tagline'],
            ['primaryCta', 'Primary button'],
            ['secondaryCta', 'Secondary button'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs uppercase tracking-wider text-gray-500">
            {label}
            <input
              value={hero[key]}
              onChange={(e) => setHero({ ...hero, [key]: e.target.value })}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
            />
          </label>
        ))}
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Who we are image</h3>
        <label className="block text-xs uppercase tracking-wider text-gray-500">
          Image URL
          <input
            value={about.imageUrl}
            onChange={(e) => setAbout({ imageUrl: e.target.value })}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
          />
        </label>
        <p className="text-[11px] text-gray-500">Example: /images/collective/collective-14.jpg</p>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Ad Studio pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField
            label="Lite base Coinz"
            value={pricing.liteBaseCoins}
            onChange={(n) => setPricing({ ...pricing, liteBaseCoins: n })}
          />
          <NumField
            label="Mini base Coinz"
            value={pricing.miniBaseCoins}
            onChange={(n) => setPricing({ ...pricing, miniBaseCoins: n })}
          />
          <NumField
            label="Fast base Coinz"
            value={pricing.fastBaseCoins}
            onChange={(n) => setPricing({ ...pricing, fastBaseCoins: n })}
          />
          <NumField
            label="Fan Club discount %"
            value={pricing.fanClubDiscountPercent}
            onChange={(n) => setPricing({ ...pricing, fanClubDiscountPercent: n })}
          />
        </div>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Image Studio Coinz (floors 1/2/4/5)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {IMAGE_TIERS.map((t: ImageTier) => (
            <NumField
              key={t}
              label={`${IMAGE_MODELS[t].label} (${t})`}
              value={Number(imageModels[t]?.baseCoins) || TIER_FLOOR[t]}
              onChange={(n) =>
                setImageModels({
                  ...imageModels,
                  [t]: { baseCoins: Math.max(TIER_FLOOR[t], n) },
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Coinz packs</h3>
        <p className="text-[11px] text-gray-500">USD stays on Stripe via live price_data. Edit Coinz amount, dollar price, and label.</p>
        <div className="space-y-3">
          {packs.map((pkg, index) => (
            <div key={pkg.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <label className="block text-xs uppercase tracking-wider text-gray-500 sm:col-span-1">
                Label
                <input
                  value={pkg.label}
                  onChange={(e) => {
                    const next = [...packs]
                    next[index] = { ...pkg, label: e.target.value }
                    setPacks(next)
                  }}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
                />
              </label>
              <NumField
                label="Coinz"
                value={pkg.amount}
                onChange={(n) => {
                  const next = [...packs]
                  next[index] = { ...pkg, amount: n }
                  setPacks(next)
                }}
              />
              <NumField
                label="USD"
                value={pkg.price}
                onChange={(n) => {
                  const next = [...packs]
                  next[index] = { ...pkg, price: n }
                  setPacks(next)
                }}
              />
              <p className="text-[10px] text-gray-500 self-end pb-2">{pkg.id}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Homepage sections</h3>
        <p className="text-[11px] text-gray-500">Reorder or hide blocks below the hero. Hero stays first.</p>
        <ul className="space-y-2">
          {sections.map((row, index) => (
            <li
              key={row.id}
              className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2"
            >
              <span className="flex-1 text-sm text-white">{HOMEPAGE_SECTION_META[row.id].label}</span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...sections]
                  ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                  setSections(next)
                }}
                className="text-[10px] uppercase px-2 py-1 rounded bg-white/10 disabled:opacity-30"
              >
                Up
              </button>
              <button
                type="button"
                disabled={index === sections.length - 1}
                onClick={() => {
                  const next = [...sections]
                  ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                  setSections(next)
                }}
                className="text-[10px] uppercase px-2 py-1 rounded bg-white/10 disabled:opacity-30"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = [...sections]
                  next[index] = { ...row, hidden: !row.hidden }
                  setSections(next)
                }}
                className={`text-[10px] uppercase px-2 py-1 rounded ${
                  row.hidden ? 'bg-white/10 text-gray-400' : 'bg-gold/20 text-gold'
                }`}
              >
                {row.hidden ? 'Hidden' : 'Visible'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h3 className="font-serif text-xl text-gold">Hidden stream IDs</h3>
        <textarea
          value={hiddenIds}
          onChange={(e) => setHiddenIds(e.target.value)}
          rows={4}
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white font-mono"
        />
        <p className="text-[11px] text-gray-500">One Kick video UUID per line.</p>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-6 py-3 bg-gold text-black text-xs font-bold uppercase tracking-widest rounded-full disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save site settings'}
      </button>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="block text-xs uppercase tracking-wider text-gray-500">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
      />
    </label>
  )
}
