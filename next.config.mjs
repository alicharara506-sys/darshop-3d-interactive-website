// The old .html addresses still work: they forward to the new routes, query string included.
const PAGES = ['shop', 'about', 'faq', 'support', 'contact', 'admin', 'viewer']

const config = {
  devIndicators: false,
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: false },
      ...PAGES.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: false })),
    ]
  },
}

export default config
