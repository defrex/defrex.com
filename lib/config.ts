export const config = {
  baseUrl:
    typeof process.env.VERCEL_URL !== 'undefined'
      ? process.env.VERCEL_URL
      : 'https://www.defrex.com',
}
