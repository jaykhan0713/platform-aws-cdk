import http from 'k6/http'
import encoding from 'k6/encoding'
import { check, fail, sleep } from 'k6'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

export const options = {
    vus: 5,
    duration: '5m'
}

const userId = uuidv4()

let cachedToken = null
let tokenExpiresAtMs = 0

function getAccessToken() {
    const now = Date.now()
    const refreshSkewMs = 30_000

    if (cachedToken && now + refreshSkewMs < tokenExpiresAtMs) {
        return cachedToken
    }

    const domain = __ENV.COGNITO_DOMAIN
    const clientId = __ENV.COGNITO_CLIENT_ID
    const clientSecret = __ENV.COGNITO_CLIENT_SECRET
    const scope = __ENV.COGNITO_SCOPE || ''

    if (!domain || !clientId || !clientSecret) {
        fail('Missing required Cognito env vars')
    }

    const url = `${domain}/oauth2/token`

    const body = scope
        ? `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`
        : 'grant_type=client_credentials'

    const res = http.post(url, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
                'Basic ' + encoding.b64encode(`${clientId}:${clientSecret}`)
        }
    })

    if (res.status !== 200) {
        console.log(`Token request failed: ${res.status} ${res.body}`)
        fail('Failed to obtain access token from Cognito')
    }

    const json = res.json()
    cachedToken = json.access_token
    tokenExpiresAtMs = now + Number(json.expires_in) * 1000

    return cachedToken
}


export default function () {
    const id = uuidv4()
    const targetUrl = `${__ENV.TARGET_URL}/${id}`
    if (!targetUrl) fail('Missing env var: TARGET_URL')

    const token = getAccessToken()

    const res = http.get(targetUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            'x-user-id': `${userId}`
        }
    })

    check(res, {
        'status is 2xx': (r) => r.status >= 200 && r.status < 300
    })

    // sleep seconds to avoid spamming
    sleep(0.03)
}
