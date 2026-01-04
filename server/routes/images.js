import express from 'express'

const router = express.Router()

/**
 * GET /api/images/proxy?url=<image-url>
 * Proxy images to handle CORS issues for Three.js textures
 * This is needed because PSN images don't support CORS headers
 */
router.get('/proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // Validate URL to prevent SSRF attacks
    try {
      const url = new URL(imageUrl)
      // Only allow HTTPS URLs
      if (url.protocol !== 'https:') {
        return res.status(400).json({ error: 'Only HTTPS URLs are allowed' })
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    // Fetch the image using native fetch (Node.js 18+)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Gameo/1.0 (Image Proxy)'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' })
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/png'

    // Set CORS headers to allow the frontend to use the image
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', contentType)
    
    // Cache the image for 7 days
    res.setHeader('Cache-Control', 'public, max-age=604800')

    // Get the image data as array buffer and send it
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
})

export { router as imagesRouter }

