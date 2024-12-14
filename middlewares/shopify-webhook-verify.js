import crypto from 'crypto';
import logger from "#common-functions/logger/index.js";

// Shopify Webhook Secret (from your Shopify store settings)
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// Middleware to verify Shopify webhook signature
export default function verifyShopifyWebhook(req, res, next) {
    logger("info", "Verifying Shopify webhook signature");
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    if (!hmac) {
        logger("info", 'No HMAC signature');
        res.status(401).send('No HMAC signature');
        return;
    }

    logger("info", `HMAC signature found ${hmac}`);
    logger("info", JSON.stringify(req.body));
    const body = JSON.stringify(req.body);
    
    const computedHmac = crypto
        .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
        .update(body, 'utf8')
        .digest('base64');
    
    if (hmac === computedHmac) {
        next(); // Signature matches, proceed to handle the webhook
    } else {
        res.status(401).send('Invalid HMAC');
    }
}