module.exports = {
  webpack: (configuration) => {
    configuration.module.rules.push({
      test: /\.md$/,
      use: 'frontmatter-markdown-loader',
    })
    return configuration
  },
  pageExtensions: ['page.tsx', 'page.ts'],
}
