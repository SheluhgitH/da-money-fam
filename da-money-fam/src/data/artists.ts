export type ArtistGalleryImage = {
  id: string
  src: string
  alt: string
}

export type Artist = {
  id: number
  name: string
  role: string
  mainImage: string | null
  description: string
  gallery: ArtistGalleryImage[]
}

export const allArtists: Artist[] = [
  {
    id: 1,
    name: 'JackPot',
    role: 'Lead Artist',
    mainImage: '/images/artists/jackpot/jackpot-1.jpg',
    description: 'Chart-topping lyricist with a unique flow',
    gallery: [
      { id: 'jp-new-1', src: '/images/artists/jackpot/jackpot-1.jpg', alt: 'JackPot 1' },
      { id: 'jp-new-2', src: '/images/artists/jackpot/jackpot-2.jpg', alt: 'JackPot 2' },
      { id: 'jp-new-3', src: '/images/artists/jackpot/jackpot-3.jpg', alt: 'JackPot 3' },
      { id: 'jp1', src: '/images/IMG_1222.png', alt: 'JackPot 4' },
      { id: 'jp2', src: '/images/IMG_1223.png', alt: 'JackPot 5' },
      { id: 'jp3', src: '/images/jackpot-extra-1.PNG', alt: 'JackPot 6' },
      { id: 'jp4', src: '/images/jackpot-magazine-1.jpg', alt: 'JackPot Magazine 1' },
      { id: 'jp5', src: '/images/jackpot-magazine-2.jpg', alt: 'JackPot Magazine 2' },
      { id: 'jp6', src: '/images/jackpot-extra-2.PNG', alt: 'JackPot 7' },
      { id: 'jp7', src: '/images/jackpot-extra-3.PNG', alt: 'JackPot 8' },
      { id: 'jp8', src: '/images/jackpot-extra-4.PNG', alt: 'JackPot 9' },
    ],
  },
  {
    id: 2,
    name: 'Vlone Tr3',
    role: 'Producer',
    mainImage: '/images/artists/vlone/vlone-3.jpg',
    description: 'Multi-platinum producer defining the sound',
    gallery: [
      { id: 'vl-new-1', src: '/images/artists/vlone/vlone-1.jpg', alt: 'Vlone Tr3 1' },
      { id: 'vl-new-2', src: '/images/artists/vlone/vlone-2.jpg', alt: 'Vlone Tr3 2' },
      { id: 'vl-new-3', src: '/images/artists/vlone/vlone-3.jpg', alt: 'Vlone Tr3 3' },
      { id: 'vl1', src: '/images/vlonetr3-2.png', alt: 'Vlone Tr3 4' },
      { id: 'vl2', src: '/images/vlonetr3-1.png', alt: 'Vlone Tr3 5' },
    ],
  },
  {
    id: 4,
    name: 'SideShowDaPlug',
    role: 'Rapper',
    mainImage: '/images/artists/sideshow/sideshow-3.jpg',
    description: 'Hard-hitting bars and magnetic stage presence',
    gallery: [
      { id: 'ss-new-3', src: '/images/artists/sideshow/sideshow-3.jpg', alt: 'SideShowDaPlug 3' },
      { id: 'ss-new-1', src: '/images/artists/sideshow/sideshow-1.jpg', alt: 'SideShowDaPlug 1' },
      { id: 'ss-new-2', src: '/images/artists/sideshow/sideshow-2.jpg', alt: 'SideShowDaPlug 2' },
      { id: 'ss-new-4', src: '/images/artists/sideshow/sideshow-4.jpg', alt: 'SideShowDaPlug 4' },
      { id: 'ss-new-5', src: '/images/artists/sideshow/sideshow-5.jpg', alt: 'SideShowDaPlug 5' },
      { id: 'ss-new-6', src: '/images/artists/sideshow/sideshow-6.jpg', alt: 'SideShowDaPlug 6' },
      { id: 'ss-new-7', src: '/images/artists/sideshow/sideshow-7.jpg', alt: 'SideShowDaPlug 7' },
      { id: 'ss-new-8', src: '/images/artists/sideshow/sideshow-8.jpg', alt: 'SideShowDaPlug 8' },
      { id: 'ss1', src: '/images/sideshowdaplug-1.png', alt: 'SideShowDaPlug 9' },
      { id: 'ss2', src: '/images/sideshowdaplug-2.png', alt: 'SideShowDaPlug 10' },
      { id: 'ss3', src: '/images/sideshowdaplug-3.png', alt: 'SideShowDaPlug 11' },
    ],
  },
  {
    id: 3,
    name: 'JayBandz',
    role: 'Vocalist',
    mainImage: null,
    description: 'Soulful vocals with luxury attitude',
    gallery: [],
  },
  {
    id: 5,
    name: 'RhyteHandP',
    role: 'CEO',
    mainImage: '/images/artists/rhytehandp/rhytehandp-1.jpg',
    description: 'Founder and visionary leading Da Money Fam',
    gallery: [],
  },
  {
    id: 6,
    name: 'JaleelDaGenesis',
    role: 'Artist',
    mainImage: null,
    description: 'Genesis of new sounds and visuals',
    gallery: [],
  },
]
